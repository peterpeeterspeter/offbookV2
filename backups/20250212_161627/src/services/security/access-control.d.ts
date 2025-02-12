import { AccessControlOptions, AccessLog, SecurityMetadata, UserRole } from './types';
/**
 * Service for managing access control and permissions
 */
export declare class AccessControlService {
    private accessLogs;
    private currentUser;
    /**
     * Sets the current user context
     */
    setUser(userId: string, role: UserRole): void;
    /**
     * Clears the current user context
     */
    clearUser(): void;
    /**
     * Checks if current user can access the data
     */
    canAccess(resourceId: string, metadata: SecurityMetadata, options?: AccessControlOptions): Promise<boolean>;
    /**
     * Checks if current user has the required role
     */
    private hasRequiredRole;
    /**
     * Logs access attempts if enabled
     */
    private logAccess;
    /**
     * Gets access logs for auditing
     */
    getAccessLogs(options?: {
        userId?: string;
        resourceId?: string;
        startTime?: number;
        endTime?: number;
    }): AccessLog[];
    /**
     * Clears access logs
     */
    clearAccessLogs(): void;
}
