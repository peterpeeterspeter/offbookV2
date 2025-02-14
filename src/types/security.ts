// WebSocket security configuration
export interface WebSocketSecurityConfig {
  maxConnections: number
  maxConnectionsPerIP: number
  pingInterval: number
  pongTimeout: number
  handshakeTimeout: number
  allowedOrigins: string[]
  requireAuthentication: boolean
  tokenValidation: boolean
  messageRateLimit: {
    windowMs: number
    maxRequests: number
  }
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number
  maxRequestsPerIP: number
  message: string
  statusCode: number
  headers: boolean
  skipFailedRequests: boolean
  skipSuccessfulRequests: boolean
  keyGenerator: (req: Request) => string
}

// CORS configuration
export interface CORSConfig {
  origin: string[]
  methods: string[]
  allowedHeaders: string[]
  exposedHeaders: string[]
  credentials: boolean
  maxAge: number
  preflightContinue: boolean
  optionsSuccessStatus: number
}

// Security headers configuration
export interface SecurityHeaders {
  'Content-Security-Policy': string
  'Strict-Transport-Security': string
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'Cross-Origin-Embedder-Policy': string
  'Cross-Origin-Opener-Policy': string
  'Cross-Origin-Resource-Policy': string
}

// Authentication configuration
export interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  refreshTokenExpiresIn: string
  passwordMinLength: number
  passwordMaxLength: number
  maxLoginAttempts: number
  lockoutDuration: number
  requireMFA: boolean
}

// Security audit logging
export type SecurityAuditLogType = 'rate-limit' | 'auth' | 'websocket' | 'api' | 'access' | 'config'
export type SecurityAuditLogSeverity = 'info' | 'warn' | 'error' | 'critical'

export interface SecurityAuditLog {
  type: SecurityAuditLogType
  timestamp: number
  severity: SecurityAuditLogSeverity
  message: string
  metadata?: Record<string, any>
}

// Security violation tracking
export type SecurityViolationType = 'rate-limit' | 'auth' | 'websocket' | 'api'

export interface SecurityViolation {
  type: SecurityViolationType
  timestamp: number
  ip: string
  userId?: string
  details: string
  headers?: Record<string, string>
}
