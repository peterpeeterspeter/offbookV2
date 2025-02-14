import { describe, it, expect, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { corsMiddleware } from '@/middleware/cors'

describe('CORS Middleware', () => {
  let mockRequest: { [key: string]: any }
  let mockHeaders: Map<string, string>

  beforeEach(() => {
    mockHeaders = new Map()
    mockRequest = {
      headers: {
        get: (key: string) => mockHeaders.get(key?.toLowerCase()) || null,
        set: (key: string, value: string) => mockHeaders.set(key.toLowerCase(), value)
      },
      method: 'GET',
      nextUrl: {
        pathname: '/api/test',
        buildId: '',
        analyze: () => ({ pathname: '', query: {} }),
        formatPathname: () => '',
        formatSearch: () => '',
        searchParams: new URLSearchParams(),
        toString: () => ''
      }
    }
  })

  describe('Origin Validation', () => {
    it('should allow requests from allowed origins', () => {
      mockHeaders.set('origin', 'http://localhost:3000')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.status).not.toBe(403)
    })

    it('should block requests from disallowed origins', () => {
      mockHeaders.set('origin', 'http://evil.com')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.status).toBe(403)
    })

    it('should handle requests without origin header', () => {
      const response = corsMiddleware(mockRequest as unknown as NextRequest)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Preflight Requests', () => {
    beforeEach(() => {
      mockRequest = {
        ...mockRequest,
        method: 'OPTIONS'
      }
    })

    it('should handle valid preflight requests', () => {
      mockHeaders.set('origin', 'http://localhost:3000')
      mockHeaders.set('access-control-request-method', 'POST')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined()
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('should reject preflight from disallowed origins', () => {
      mockHeaders.set('origin', 'http://evil.com')
      mockHeaders.set('access-control-request-method', 'POST')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.status).toBe(403)
    })
  })

  describe('Credentials Handling', () => {
    it('should handle requests with credentials', () => {
      mockHeaders.set('origin', 'http://localhost:3000')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should not expose credentials header for disallowed origins', () => {
      mockHeaders.set('origin', 'http://evil.com')
      const response = corsMiddleware(mockRequest as unknown as NextRequest)

      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })
  })
})
