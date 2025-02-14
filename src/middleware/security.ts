import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting state
const rateLimitState = new Map<string, { count: number; resetTime: number }>()

// Security headers
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "media-src 'self' blob:; " +
    "connect-src 'self' ws: wss:; " +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'microphone=(), camera=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
}

export async function securityMiddleware(request: NextRequest) {
  // Start with the default response
  const response = NextResponse.next()

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Handle CORS
  const origin = request.headers.get('origin')
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    } else {
      return new NextResponse('Not allowed', { status: 403 })
    }
  }

  // Handle rate limiting
  const ip = request.ip || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 100

  const counter = rateLimitState.get(ip)
  if (!counter || now > counter.resetTime) {
    rateLimitState.set(ip, {
      count: 1,
      resetTime: now + windowMs
    })
  } else {
    counter.count++
    if (counter.count > maxRequests) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((counter.resetTime - now) / 1000).toString()
        }
      })
    }
  }

  // Clean up old rate limit entries
  for (const [ip, counter] of rateLimitState.entries()) {
    if (now > counter.resetTime) {
      rateLimitState.delete(ip)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/ws/:path*'
  ]
}
