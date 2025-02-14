import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitState = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
}

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.ip || 'unknown'
  const now = Date.now()

  const counter = rateLimitState.get(ip)
  if (!counter || now > counter.resetTime) {
    rateLimitState.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    })
    return NextResponse.next()
  }

  counter.count++
  if (counter.count > RATE_LIMIT.maxRequests) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((counter.resetTime - now) / 1000).toString()
      }
    })
  }

  // Clean up old entries
  for (const [key, value] of rateLimitState.entries()) {
    if (now > value.resetTime) {
      rateLimitState.delete(key)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
