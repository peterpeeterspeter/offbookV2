import { CORSConfig, SecurityAuditLog, SecurityViolation } from '@/types/security'
import { SECURITY_CONFIG } from '@/config/security'

class CORSMiddleware {
  private violations: SecurityViolation[] = []
  private auditLog: SecurityAuditLog[] = []

  constructor(private config: CORSConfig = SECURITY_CONFIG.cors) {}

  public handleRequest(req: Request): Response | null {
    const origin = req.headers.get('origin')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return this.handlePreflight(req)
    }

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      this.logViolation({
        type: 'api',
        timestamp: Date.now(),
        ip: this.getClientIP(req),
        details: 'Invalid origin',
        headers: Object.fromEntries(req.headers)
      })
      return new Response('Not allowed', { status: 403 })
    }

    // Add CORS headers to the response
    return null // Continue to next middleware
  }

  public addCORSHeaders(headers: Headers, origin: string | null): void {
    if (origin && this.isOriginAllowed(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Methods', this.config.methods.join(', '))
      headers.set('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '))
      headers.set('Access-Control-Expose-Headers', this.config.exposedHeaders.join(', '))

      if (this.config.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true')
      }

      headers.set('Access-Control-Max-Age', this.config.maxAge.toString())
    }
  }

  private handlePreflight(req: Request): Response {
    const origin = req.headers.get('origin')
    const method = req.headers.get('access-control-request-method')
    const headers = req.headers.get('access-control-request-headers')

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      this.logViolation({
        type: 'api',
        timestamp: Date.now(),
        ip: this.getClientIP(req),
        details: 'Invalid origin in preflight',
        headers: Object.fromEntries(req.headers)
      })
      return new Response(null, { status: 403 })
    }

    // Check if method is allowed
    if (method && !this.config.methods.includes(method)) {
      this.logViolation({
        type: 'api',
        timestamp: Date.now(),
        ip: this.getClientIP(req),
        details: 'Invalid method in preflight',
        headers: Object.fromEntries(req.headers)
      })
      return new Response(null, { status: 403 })
    }

    // Check if headers are allowed
    if (headers) {
      const requestedHeaders = headers.split(',').map(h => h.trim())
      if (!this.areHeadersAllowed(requestedHeaders)) {
        this.logViolation({
          type: 'api',
          timestamp: Date.now(),
          ip: this.getClientIP(req),
          details: 'Invalid headers in preflight',
          headers: Object.fromEntries(req.headers)
        })
        return new Response(null, { status: 403 })
      }
    }

    // Create preflight response
    const responseHeaders = new Headers()
    this.addCORSHeaders(responseHeaders, origin)

    return new Response(null, {
      status: this.config.optionsSuccessStatus,
      headers: responseHeaders
    })
  }

  private isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false
    return this.config.origin.includes(origin) || this.config.origin.includes('*')
  }

  private areHeadersAllowed(requestedHeaders: string[]): boolean {
    return requestedHeaders.every(header =>
      this.config.allowedHeaders.includes(header.toLowerCase())
    )
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

export const corsMiddleware = new CORSMiddleware()
