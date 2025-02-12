import { AccessControlOptions, AccessLog, SecurityMetadata, UserRole } from './types';

/**
 * Service for managing access control and permissions
 */
export class AccessControlService {
  private accessLogs: AccessLog[] = [];
  private currentUser: { id: string; role: UserRole } | null = null;

  /**
   * Sets the current user context
   */
  setUser(userId: string, role: UserRole) {
    this.currentUser = { id: userId, role };
  }

  /**
   * Clears the current user context
   */
  clearUser() {
    this.currentUser = null;
  }

  /**
   * Checks if current user can access the data
   */
  async canAccess(
    resourceId: string,
    metadata: SecurityMetadata,
    options?: AccessControlOptions
  ): Promise<boolean> {
    if (!this.currentUser) {
      this.logAccess(resourceId, false, 'No user context');
      return false;
    }

    // Check role-based access
    if (options?.requiredRole) {
      const hasRole = this.hasRequiredRole(options.requiredRole);
      if (!hasRole) {
        this.logAccess(resourceId, false, 'Insufficient role');
        return false;
      }
    }

    // Check user-specific access
    if (options?.allowedUsers?.length) {
      const isAllowed = options.allowedUsers.includes(this.currentUser.id);
      if (!isAllowed) {
        this.logAccess(resourceId, false, 'User not in allowed list');
        return false;
      }
    }

    // Check ownership for private data
    if (metadata.accessLevel === 'private') {
      // Admin can access all private data
      if (this.currentUser.role === 'admin') {
        this.logAccess(resourceId, true, 'Admin access granted');
        return true;
      }

      // Others can only access their own private data
      if (metadata.createdBy !== this.currentUser.id) {
        this.logAccess(resourceId, false, 'Not owner of private data');
        return false;
      }
    }

    // Check if data requires special handling
    if (metadata.accessLevel === 'sensitive' && this.currentUser.role !== 'admin') {
      this.logAccess(resourceId, false, 'Sensitive data requires admin role');
      return false;
    }

    this.logAccess(resourceId, true);
    return true;
  }

  /**
   * Checks if current user has the required role
   */
  private hasRequiredRole(requiredRole: UserRole): boolean {
    if (!this.currentUser) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      user: 2,
      guest: 1
    };

    return roleHierarchy[this.currentUser.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Logs access attempts if enabled
   */
  private logAccess(resourceId: string, granted: boolean, reason?: string) {
    const log: AccessLog = {
      timestamp: Date.now(),
      userId: this.currentUser?.id || 'anonymous',
      resourceId,
      granted,
      reason
    };

    this.accessLogs.push(log);

    // Keep only last 1000 logs
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }
  }

  /**
   * Gets access logs for auditing
   */
  getAccessLogs(
    options?: {
      userId?: string;
      resourceId?: string;
      startTime?: number;
      endTime?: number;
    }
  ): AccessLog[] {
    let filtered = this.accessLogs;

    if (options?.userId) {
      filtered = filtered.filter(log => log.userId === options.userId);
    }

    if (options?.resourceId) {
      filtered = filtered.filter(log => log.resourceId === options.resourceId);
    }

    if (options?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime!);
    }

    return filtered;
  }

  /**
   * Clears access logs
   */
  clearAccessLogs() {
    this.accessLogs = [];
  }
}
