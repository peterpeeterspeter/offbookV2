import { describe, it, expect, vi, beforeEach } from 'vitest'
import { securityMonitoring } from '../monitoring'
import { SecurityViolation, SecurityAuditLog } from '@/types/security'

describe('SecurityMonitoring', () => {
  beforeEach(() => {
    // Clear all logs and violations before each test
    securityMonitoring.clearViolations()
    securityMonitoring.clearAuditLogs()
  })

  describe('Violation Logging', () => {
    it('should log violations and create corresponding audit logs', () => {
      const violation: SecurityViolation = {
        type: 'rate-limit',
        timestamp: Date.now(),
        ip: '192.168.1.1',
        userId: 'user123',
        details: 'Rate limit exceeded',
        headers: { 'user-agent': 'test-agent' }
      }

      securityMonitoring.logViolation(violation)

      const violations = securityMonitoring.getViolations()
      expect(violations).toHaveLength(1)
      expect(violations[0]).toEqual(violation)

      const auditLogs = securityMonitoring.getAuditLogs()
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0]).toMatchObject({
        type: violation.type,
        severity: 'error',
        message: violation.details,
        metadata: {
          ip: violation.ip,
          userId: violation.userId,
          headers: violation.headers
        }
      })
    })

    it('should notify violation subscribers', () => {
      const mockCallback = vi.fn()
      const unsubscribe = securityMonitoring.onViolation(mockCallback)

      const violation: SecurityViolation = {
        type: 'auth',
        timestamp: Date.now(),
        ip: '192.168.1.1',
        details: 'Invalid credentials'
      }

      securityMonitoring.logViolation(violation)
      expect(mockCallback).toHaveBeenCalledWith(violation)

      unsubscribe()
      securityMonitoring.logViolation(violation)
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Audit Logging', () => {
    it('should log audit events and notify subscribers', () => {
      const mockCallback = vi.fn()
      const unsubscribe = securityMonitoring.onAuditLog(mockCallback)

      const auditLog: SecurityAuditLog = {
        type: 'access',
        timestamp: Date.now(),
        severity: 'info',
        message: 'User login successful',
        metadata: { userId: 'user123' }
      }

      securityMonitoring.logAudit(auditLog)

      const logs = securityMonitoring.getAuditLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toEqual(auditLog)
      expect(mockCallback).toHaveBeenCalledWith(auditLog)

      unsubscribe()
      securityMonitoring.logAudit(auditLog)
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Filtering and Stats', () => {
    it('should filter violations by criteria', () => {
      const now = Date.now()
      const violations: SecurityViolation[] = [
        {
          type: 'rate-limit',
          timestamp: now - 5000,
          ip: '192.168.1.1',
          details: 'Rate limit exceeded'
        },
        {
          type: 'auth',
          timestamp: now - 3000,
          ip: '192.168.1.2',
          details: 'Invalid token'
        },
        {
          type: 'rate-limit',
          timestamp: now - 1000,
          ip: '192.168.1.1',
          details: 'Rate limit exceeded'
        }
      ]

      violations.forEach(v => securityMonitoring.logViolation(v))

      expect(securityMonitoring.getViolations({ type: 'rate-limit' })).toHaveLength(2)
      expect(securityMonitoring.getViolations({ ip: '192.168.1.1' })).toHaveLength(2)
      expect(securityMonitoring.getViolations({ startTime: now - 2000 })).toHaveLength(1)
    })

    it('should generate accurate statistics', () => {
      const violations: SecurityViolation[] = [
        {
          type: 'rate-limit',
          timestamp: Date.now(),
          ip: '192.168.1.1',
          details: 'Rate limit exceeded'
        },
        {
          type: 'auth',
          timestamp: Date.now(),
          ip: '192.168.1.2',
          details: 'Invalid token'
        },
        {
          type: 'rate-limit',
          timestamp: Date.now(),
          ip: '192.168.1.1',
          details: 'Rate limit exceeded'
        }
      ]

      const auditLogs: SecurityAuditLog[] = [
        {
          type: 'access',
          timestamp: Date.now(),
          severity: 'info',
          message: 'User login'
        },
        {
          type: 'config',
          timestamp: Date.now(),
          severity: 'warn',
          message: 'Config changed'
        }
      ]

      violations.forEach(v => securityMonitoring.logViolation(v))
      auditLogs.forEach(l => securityMonitoring.logAudit(l))

      const stats = securityMonitoring.getStats()
      expect(stats.totalViolations).toBe(3)
      expect(stats.violationsByType['rate-limit']).toBe(2)
      expect(stats.violationsByType['auth']).toBe(1)
      expect(stats.violationsByIP['192.168.1.1']).toBe(2)
      expect(stats.auditLogsByType['access']).toBe(1)
      expect(stats.auditLogsBySeverity['info']).toBe(1)
      expect(stats.auditLogsBySeverity['warn']).toBe(1)
    })
  })
})
