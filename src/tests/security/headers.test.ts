import { describe, it, expect } from 'vitest'
import { securityHeadersMiddleware } from '@/middleware/headers'

describe('Security Headers Middleware', () => {
  it('should add all required security headers', () => {
    const response = securityHeadersMiddleware()

    // Test CSP header
    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("connect-src 'self' ws: wss:")

    // Test other security headers
    expect(response.headers.get('Strict-Transport-Security'))
      .toBe('max-age=31536000; includeSubDomains')
    expect(response.headers.get('X-Content-Type-Options'))
      .toBe('nosniff')
    expect(response.headers.get('X-Frame-Options'))
      .toBe('DENY')
    expect(response.headers.get('X-XSS-Protection'))
      .toBe('1; mode=block')
    expect(response.headers.get('Referrer-Policy'))
      .toBe('strict-origin-when-cross-origin')
  })

  it('should have secure CSP directives', () => {
    const response = securityHeadersMiddleware()
    const csp = response.headers.get('Content-Security-Policy')

    // Check for required CSP directives
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("connect-src 'self' ws: wss:")
    expect(csp).not.toContain("unsafe-eval")
    expect(csp).not.toContain("data:")
  })

  it('should not allow dangerous CSP values', () => {
    const response = securityHeadersMiddleware()
    const csp = response.headers.get('Content-Security-Policy')

    // Check for potentially dangerous values
    expect(csp).not.toContain("*")
    expect(csp).not.toContain("unsafe-eval")
    expect(csp).not.toContain("http:")
  })
})
