import { SecurityAuditLog, SecurityViolation } from '@/types/security'

class SecurityMonitoring {
  private static instance: SecurityMonitoring
  private auditLogs: SecurityAuditLog[] = []
  private violations: SecurityViolation[] = []
  private alertCallbacks: ((violation: SecurityViolation) => void)[] = []
  private logCallbacks: ((log: SecurityAuditLog) => void)[] = []

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): SecurityMonitoring {
    if (!SecurityMonitoring.instance) {
      SecurityMonitoring.instance = new SecurityMonitoring()
    }
    return SecurityMonitoring.instance
  }

  public logViolation(violation: SecurityViolation): void {
    this.violations.push(violation)

    // Create audit log for violation
    this.logAudit({
      timestamp: violation.timestamp,
      type: violation.type,
      severity: 'error',
      message: violation.details,
      metadata: {
        ip: violation.ip,
        userId: violation.userId,
        headers: violation.headers
      }
    })

    // Notify alert subscribers
    this.alertCallbacks.forEach(callback => callback(violation))
  }

  public logAudit(log: SecurityAuditLog): void {
    this.auditLogs.push(log)

    // Notify log subscribers
    this.logCallbacks.forEach(callback => callback(log))

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Security Audit:', log)
    }
  }

  public getViolations(options?: {
    startTime?: number
    endTime?: number
    type?: SecurityViolation['type']
    ip?: string
  }): SecurityViolation[] {
    let filtered = [...this.violations]

    if (options?.startTime) {
      filtered = filtered.filter(v => v.timestamp >= options.startTime!)
    }
    if (options?.endTime) {
      filtered = filtered.filter(v => v.timestamp <= options.endTime!)
    }
    if (options?.type) {
      filtered = filtered.filter(v => v.type === options.type)
    }
    if (options?.ip) {
      filtered = filtered.filter(v => v.ip === options.ip)
    }

    return filtered
  }

  public getAuditLogs(options?: {
    startTime?: number
    endTime?: number
    type?: SecurityAuditLog['type']
    severity?: SecurityAuditLog['severity']
  }): SecurityAuditLog[] {
    let filtered = [...this.auditLogs]

    if (options?.startTime) {
      filtered = filtered.filter(l => l.timestamp >= options.startTime!)
    }
    if (options?.endTime) {
      filtered = filtered.filter(l => l.timestamp <= options.endTime!)
    }
    if (options?.type) {
      filtered = filtered.filter(l => l.type === options.type)
    }
    if (options?.severity) {
      filtered = filtered.filter(l => l.severity === options.severity)
    }

    return filtered
  }

  public onViolation(callback: (violation: SecurityViolation) => void): () => void {
    this.alertCallbacks.push(callback)
    return () => {
      const index = this.alertCallbacks.indexOf(callback)
      if (index > -1) {
        this.alertCallbacks.splice(index, 1)
      }
    }
  }

  public onAuditLog(callback: (log: SecurityAuditLog) => void): () => void {
    this.logCallbacks.push(callback)
    return () => {
      const index = this.logCallbacks.indexOf(callback)
      if (index > -1) {
        this.logCallbacks.splice(index, 1)
      }
    }
  }

  public clearViolations(before?: number): void {
    if (before) {
      this.violations = this.violations.filter(v => v.timestamp > before)
    } else {
      this.violations = []
    }
  }

  public clearAuditLogs(before?: number): void {
    if (before) {
      this.auditLogs = this.auditLogs.filter(l => l.timestamp > before)
    } else {
      this.auditLogs = []
    }
  }

  public getStats(): {
    totalViolations: number
    violationsByType: Record<SecurityViolation['type'], number>
    violationsByIP: Record<string, number>
    auditLogsByType: Record<SecurityAuditLog['type'], number>
    auditLogsBySeverity: Record<SecurityAuditLog['severity'], number>
  } {
    const stats = {
      totalViolations: this.violations.length,
      violationsByType: {} as Record<SecurityViolation['type'], number>,
      violationsByIP: {} as Record<string, number>,
      auditLogsByType: {} as Record<SecurityAuditLog['type'], number>,
      auditLogsBySeverity: {} as Record<SecurityAuditLog['severity'], number>
    }

    // Count violations by type and IP
    this.violations.forEach(v => {
      stats.violationsByType[v.type] = (stats.violationsByType[v.type] || 0) + 1
      stats.violationsByIP[v.ip] = (stats.violationsByIP[v.ip] || 0) + 1
    })

    // Count audit logs by type and severity
    this.auditLogs.forEach(l => {
      stats.auditLogsByType[l.type] = (stats.auditLogsByType[l.type] || 0) + 1
      stats.auditLogsBySeverity[l.severity] = (stats.auditLogsBySeverity[l.severity] || 0) + 1
    })

    return stats
  }
}

export const securityMonitoring = SecurityMonitoring.getInstance()
