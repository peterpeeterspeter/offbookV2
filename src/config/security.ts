import { WebSocketSecurityConfig, RateLimitConfig, CORSConfig, SecurityHeaders } from '@/types/security'

export const SECURITY_CONFIG = {
  webSocket: {
    // WebSocket security configuration
    maxConnections: 1000,
    maxConnectionsPerIP: 10,
    pingInterval: 30000, // 30 seconds
    pongTimeout: 5000, // 5 seconds
    handshakeTimeout: 10000, // 10 seconds
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    requireAuthentication: true,
    tokenValidation: true,
    messageRateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100 // 100 requests per minute
    }
  } satisfies WebSocketSecurityConfig,

  api: {
    // Rate limiting configuration
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequestsPerIP: 100,
      message: 'Too many requests',
      statusCode: 429,
      headers: true,
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
      keyGenerator: (req: Request) => req.headers.get('x-forwarded-for') || 'unknown'
    } satisfies RateLimitConfig,

    // Authentication configuration
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
      passwordMinLength: 8,
      passwordMaxLength: 128,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      requireMFA: false
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  } satisfies CORSConfig,

  // Security headers
  headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' ws: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'microphone=(), camera=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  } satisfies SecurityHeaders
}
