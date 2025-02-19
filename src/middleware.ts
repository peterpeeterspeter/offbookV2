import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { securityHeadersMiddleware } from './middleware/headers'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { corsMiddleware } from './middleware/cors'
import { getToken } from 'next-auth/jwt'

// List of paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/auth/callback',
  '/api/auth/_log',
  '/practice',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CORS headers for development
  const response = NextResponse.next()
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response
  }

  // Check if the path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return response
  }

  try {
    // Verify authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // If no token and trying to access protected route, redirect to login
    if (!token && !pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next/ (Next.js internals)
     * 2. /static/ (static files)
     * 3. /favicon.ico, /robots.txt (static files)
     */
    '/((?!_next/|static/|favicon.ico|robots.txt).*)',
  ]
}
