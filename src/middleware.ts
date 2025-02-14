import type { NextRequest } from 'next/server'
import { securityHeadersMiddleware } from './middleware/headers'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { corsMiddleware } from './middleware/cors'

export async function middleware(request: NextRequest) {
  // Apply security headers to all requests
  const response = securityHeadersMiddleware()

  // Apply CORS for API and WebSocket routes
  if (request.nextUrl.pathname.startsWith('/api') || request.nextUrl.pathname.startsWith('/ws')) {
    const corsResponse = corsMiddleware(request)
    if (corsResponse.status !== 200) {
      return corsResponse
    }

    // Copy CORS headers to our response
    corsResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        response.headers.set(key, value)
      }
    })
  }

  // Apply rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const rateLimitResponse = rateLimitMiddleware(request)
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    '/:path*',
    '/api/:path*',
    '/ws/:path*'
  ]
}
