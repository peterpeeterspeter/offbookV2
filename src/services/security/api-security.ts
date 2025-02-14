import { RateLimitConfig, SecurityAuditLog, SecurityViolation } from '@/types/security'
import { SECURITY_CONFIG } from '@/config/security'

class ApiSecurity {
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map()
  private violations: SecurityViolation[] = []
  private auditLog: SecurityAuditLog[] = []

  constructor(private config = SECURITY_CONFIG.api) {}

  public async handleRequest(req: Request): Promise<Response | null> {
    const ip = this.getClientIP(req)

    // Check rate limiting
    const rateLimitResponse = this.checkRateLimit(ip)
    if (rateLimitResponse) return rateLimitResponse

    // Check authentication for protected routes
    if (this.isProtectedRoute(req)) {
      const authResponse = await this.checkAuthentication(req)
      if (authResponse) return authResponse
    }

    // Add security headers
    return null // Continue to next middleware
  }

  private checkRateLimit(ip: string): Response | null {
    const { rateLimit } = this.config
    const now = Date.now()
    const counter = this.rateLimitCounters.get(ip)

    if (!counter || now > counter.resetTime) {
      this.rateLimitCounters.set(ip, {
        count: 1,
        resetTime: now + rateLimit.windowMs
      })
      return null
    }

    counter.count++
    if (counter.count > rateLimit.maxRequestsPerIP) {
      this.logViolation({
        type: 'rate-limit',
        timestamp: now,
        ip,
        details: 'API rate limit exceeded'
      })

      return new Response(rateLimit.message, {
        status: rateLimit.statusCode,
        headers: {
          'X-RateLimit-Limit': rateLimit.maxRequestsPerIP.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': counter.resetTime.toString()
        }
      })
    }

    return null
  }

  private async checkAuthentication(req: Request): Promise<Response | null> {
    const token = req.headers.get('authorization')?.split(' ')[1]

    if (!token) {
      this.logViolation({
        type: 'auth',
        timestamp: Date.now(),
        ip: this.getClientIP(req),
        details: 'Missing authentication token',
        headers: Object.fromEntries(req.headers)
      })

      return new Response('Unauthorized', { status: 401 })
    }

    try {
      // Implement your token validation logic here
      // For example, using JWT:
      // const decoded = jwt.verify(token, this.config.auth.jwtSecret)
      // if (!decoded) throw new Error('Invalid token')
      return null
    } catch (error) {
      this.logViolation({
        type: 'auth',
        timestamp: Date.now(),
        ip: this.getClientIP(req),
        details: 'Invalid authentication token',
        headers: Object.fromEntries(req.headers)
      })

      return new Response('Unauthorized', { status: 401 })
    }
  }

  private isProtectedRoute(req: Request): boolean {
    const protectedPaths = [
      '/api/auth/',
      '/api/user/',
      '/api/admin/',
      '/api/whisper/'
    ]
    return protectedPaths.some(path => req.url.includes(path))
  }

  public addSecurityHeaders(headers: Headers): void {
    Object.entries(SECURITY_CONFIG.headers).forEach(([key, value]) => {
      headers.set(key, value)
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

export const apiSecurity = new ApiSecurity()
