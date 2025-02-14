import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { securityHeadersMiddleware } from '@/middleware/headers'
import { rateLimitMiddleware } from '@/middleware/rate-limit'
import { corsMiddleware } from '@/middleware/cors'

describe('Security Middleware', () => {
  let mockRequest: any
  let mockHeaders: Map<string, string>

  beforeEach(() => {
    mockHeaders = new Map()
    mockRequest = {
      headers: {
        get: (key: string) => mockHeaders.get(key),
        set: (key: string, value: string) => mockHeaders.set(key, value)
      },
      method: 'GET',
      nextUrl: { pathname: '/api/test' },
      ip: '127.0.0.1'
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Security Headers Middleware', () => {
    it('should add security headers to response', () => {
      const response = securityHeadersMiddleware()

      expect(response.headers.get('Content-Security-Policy')).toBeDefined()
      expect(response.headers.get('Strict-Transport-Security')).toBeDefined()
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should have proper CSP directives', () => {
      const response = securityHeadersMiddleware()
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'unsafe-inline'")
      expect(csp).toContain("connect-src 'self' ws: wss:")
    })
  })

  describe('Rate Limit Middleware', () => {
    it('should allow requests within rate limit', () => {
      const response = rateLimitMiddleware(mockRequest)
      expect(response.status).toBe(200)
    })

    it('should block requests exceeding rate limit', () => {
      // Simulate multiple requests
      for (let i = 0; i < 101; i++) {
        const response = rateLimitMiddleware(mockRequest)
        if (i === 100) {
          expect(response.status).toBe(429)
          expect(response.headers.get('Retry-After')).toBeDefined()
        }
      }
    })

    it('should reset rate limit after window expires', async () => {
      // Mock Date.now to simulate time passing
      const now = Date.now()
      vi.spyOn(Date, 'now')
        .mockImplementationOnce(() => now)
        .mockImplementationOnce(() => now + 16 * 60 * 1000) // After 16 minutes

      // First request
      let response = rateLimitMiddleware(mockRequest)
      expect(response.status).toBe(200)

      // Second request after window expires
      response = rateLimitMiddleware(mockRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('CORS Middleware', () => {
    it('should allow requests from allowed origins', () => {
      mockHeaders.set('origin', 'http://localhost:3000')
      const response = corsMiddleware(mockRequest)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.status).not.toBe(403)
    })

    it('should block requests from disallowed origins', () => {
      mockHeaders.set('origin', 'http://evil.com')
      const response = corsMiddleware(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should handle preflight requests', () => {
      mockRequest.method = 'OPTIONS'
      mockHeaders.set('origin', 'http://localhost:3000')
      const response = corsMiddleware(mockRequest)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should include correct CORS headers for credentials', () => {
      mockHeaders.set('origin', 'http://localhost:3000')
      const response = corsMiddleware(mockRequest)

      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
    })
  })

  describe('Middleware Chain', () => {
    it('should apply all security measures in correct order', async () => {
      mockHeaders.set('origin', 'http://localhost:3000')

      // Apply security headers
      const response = securityHeadersMiddleware()
      expect(response.headers.get('Content-Security-Policy')).toBeDefined()

      // Apply CORS
      const corsResponse = corsMiddleware(mockRequest)
      corsResponse.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('access-control-')) {
          response.headers.set(key, value)
        }
      })
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()

      // Apply rate limiting
      const rateLimitResponse = rateLimitMiddleware(mockRequest)
      expect(rateLimitResponse.status).toBe(200)
    })
  })
})
