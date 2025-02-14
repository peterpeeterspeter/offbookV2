import { WebSocketSecurityConfig, SecurityAuditLog, SecurityViolation } from '@/types/security'
import { SECURITY_CONFIG } from '@/config/security'

class WebSocketSecurity {
  private connections: Map<string, Set<WebSocket>> = new Map()
  private messageCounters: Map<string, { count: number; resetTime: number }> = new Map()
  private violations: SecurityViolation[] = []
  private auditLog: SecurityAuditLog[] = []

  constructor(private config: WebSocketSecurityConfig = SECURITY_CONFIG.webSocket) {}

  public handleConnection(ws: WebSocket, req: Request): boolean {
    const ip = this.getClientIP(req)

    // Check connection limits
    if (!this.checkConnectionLimits(ip)) {
      this.logViolation({
        type: 'websocket',
        timestamp: Date.now(),
        ip,
        details: 'Connection limit exceeded'
      })
      return false
    }

    // Check origin
    if (!this.checkOrigin(req)) {
      this.logViolation({
        type: 'websocket',
        timestamp: Date.now(),
        ip,
        details: 'Invalid origin',
        headers: Object.fromEntries(req.headers)
      })
      return false
    }

    // Check authentication if required
    if (this.config.requireAuthentication && !this.checkAuthentication(req)) {
      this.logViolation({
        type: 'websocket',
        timestamp: Date.now(),
        ip,
        details: 'Authentication failed',
        headers: Object.fromEntries(req.headers)
      })
      return false
    }

    // Add connection to tracking
    this.trackConnection(ip, ws)

    // Set up ping/pong
    this.setupHeartbeat(ws)

    // Set up message rate limiting
    this.setupRateLimiting(ws, ip)

    return true
  }

  private checkConnectionLimits(ip: string): boolean {
    // Check total connections
    const totalConnections = Array.from(this.connections.values())
      .reduce((sum, set) => sum + set.size, 0)
    if (totalConnections >= this.config.maxConnections) {
      return false
    }

    // Check per-IP connections
    const ipConnections = this.connections.get(ip)?.size || 0
    if (ipConnections >= this.config.maxConnectionsPerIP) {
      return false
    }

    return true
  }

  private checkOrigin(req: Request): boolean {
    const origin = req.headers.get('origin')
    if (!origin) return false
    return this.config.allowedOrigins.includes(origin)
  }

  private checkAuthentication(req: Request): boolean {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return false

    try {
      // Implement your token validation logic here
      // For example, using JWT:
      // return jwt.verify(token, process.env.JWT_SECRET)
      return true
    } catch (error) {
      return false
    }
  }

  private trackConnection(ip: string, ws: WebSocket): void {
    if (!this.connections.has(ip)) {
      this.connections.set(ip, new Set())
    }
    this.connections.get(ip)?.add(ws)

    // Clean up on connection close
    ws.addEventListener('close', () => {
      this.connections.get(ip)?.delete(ws)
      if (this.connections.get(ip)?.size === 0) {
        this.connections.delete(ip)
      }
    })
  }

  private setupHeartbeat(ws: WebSocket): void {
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send('ping')

        // Set up pong timeout
        const pongTimeout = setTimeout(() => {
          this.logAudit({
            timestamp: Date.now(),
            type: 'websocket',
            severity: 'warn',
            message: 'Client failed to respond to ping',
            metadata: {}
          })
          ws.close()
        }, this.config.pongTimeout)

        // Clear timeout on pong
        ws.addEventListener('message', function pongHandler(event) {
          if (event.data === 'pong') {
            clearTimeout(pongTimeout)
            ws.removeEventListener('message', pongHandler)
          }
        })
      }
    }, this.config.pingInterval)

    ws.addEventListener('close', () => {
      clearInterval(pingInterval)
    })
  }

  private setupRateLimiting(ws: WebSocket, ip: string): void {
    const { windowMs, maxRequests } = this.config.messageRateLimit

    ws.addEventListener('message', () => {
      const now = Date.now()
      const counter = this.messageCounters.get(ip)

      if (!counter || now > counter.resetTime) {
        this.messageCounters.set(ip, {
          count: 1,
          resetTime: now + windowMs
        })
      } else {
        counter.count++
        if (counter.count > maxRequests) {
          this.logViolation({
            type: 'rate-limit',
            timestamp: now,
            ip,
            details: 'Message rate limit exceeded'
          })
          ws.close(1008, 'Rate limit exceeded')
        }
      }
    })
  }

  private getClientIP(req: Request): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  }

  private logViolation(violation: SecurityViolation): void {
    this.violations.push(violation)
    this.logAudit({
      timestamp: violation.timestamp,
      type: violation.type,
      severity: 'error',
      message: violation.details,
      metadata: {
        ip: violation.ip,
        userId: violation.userId,
        headers: violation.headers
      }
    })
  }

  private logAudit(log: SecurityAuditLog): void {
    this.auditLog.push(log)
    // Implement your audit log persistence here
    console.error('Security Audit:', log)
  }

  public getViolations(): SecurityViolation[] {
    return [...this.violations]
  }

  public getAuditLog(): SecurityAuditLog[] {
    return [...this.auditLog]
  }

  public clearViolations(): void {
    this.violations = []
  }

  public clearAuditLog(): void {
    this.auditLog = []
  }
}

export const webSocketSecurity = new WebSocketSecurity()
