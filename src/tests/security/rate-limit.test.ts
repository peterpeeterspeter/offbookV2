import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimitMiddleware } from '@/middleware/rate-limit'

describe('Rate Limit Middleware', () => {
  let mockRequest: any
  let now: number

  beforeEach(() => {
    now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    mockRequest = {
      ip: '127.0.0.1',
      headers: new Map(),
      method: 'GET',
      nextUrl: { pathname: '/api/test' }
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should allow requests within rate limit', () => {
    const response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(200)
  })

  it('should block requests exceeding rate limit', () => {
    // Make 100 requests (within limit)
    for (let i = 0; i < 100; i++) {
      const response = rateLimitMiddleware(mockRequest)
      expect(response.status).toBe(200)
    }

    // Make one more request (exceeding limit)
    const response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeDefined()
  })

  it('should reset rate limit after window expires', () => {
    // Make initial request
    let response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(200)

    // Advance time by 16 minutes (beyond 15-minute window)
    now += 16 * 60 * 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    // Make another request
    response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(200)
  })

  it('should track limits per IP address', () => {
    // Make requests from first IP
    for (let i = 0; i < 100; i++) {
      const response = rateLimitMiddleware(mockRequest)
      expect(response.status).toBe(200)
    }

    // Switch to second IP
    mockRequest.ip = '127.0.0.2'

    // Should be able to make requests from new IP
    const response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(200)
  })

  it('should include proper rate limit headers', () => {
    // Make some requests to test headers
    for (let i = 0; i < 50; i++) {
      rateLimitMiddleware(mockRequest)
    }

    const response = rateLimitMiddleware(mockRequest)
    expect(response.headers.get('Retry-After')).toBeUndefined() // Still within limit
    expect(response.status).toBe(200)
  })

  it('should handle undefined IP addresses', () => {
    mockRequest.ip = undefined

    const response = rateLimitMiddleware(mockRequest)
    expect(response.status).toBe(200) // Should still work with fallback 'unknown' IP
  })
})
