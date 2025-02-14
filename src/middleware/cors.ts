import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CORS_CONFIG = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}

export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    if (!origin || !CORS_CONFIG.allowedOrigins.includes(origin)) {
      return new NextResponse(null, { status: 403 })
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
        'Access-Control-Allow-Credentials': CORS_CONFIG.credentials.toString(),
        'Access-Control-Max-Age': '86400' // 24 hours
      }
    })
  }

  // Handle actual requests
  const response = NextResponse.next()

  if (origin) {
    if (CORS_CONFIG.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      if (CORS_CONFIG.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }
    } else {
      return new NextResponse(null, { status: 403 })
    }
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/ws/:path*']
}
