/**
 * Access level for data
 */
export type AccessLevel = 'public' | 'protected' | 'private' | 'sensitive';
/**
 * User role in the system
 */
export type UserRole = 'admin' | 'user' | 'guest';
/**
 * Data retention policy
 */
export interface RetentionPolicy {
    /** How long to keep the data (in milliseconds) */
    duration: number;
    /** Whether to archive instead of delete */
    archive?: boolean;
    /** Whether to require explicit consent for storage */
    requiresConsent?: boolean;
}
/**
 * Security metadata for stored data
 */
export interface SecurityMetadata {
    /** Access level of the data */
    accessLevel: AccessLevel;
    /** Who created the data */
    createdBy: string;
    /** When the data was created */
    createdAt: number;
    /** When to delete/archive the data */
    retentionDate?: number;
    /** Whether user consented to storage */
    hasConsent?: boolean;
    /** Encryption version used */
    encryptionVersion: number;
    /** Hash of the original data for integrity check */
    integrityHash: string;
}
/**
 * Access control options
 */
export interface AccessControlOptions {
    /** Required role to access the data */
    requiredRole?: UserRole;
    /** Specific users who can access the data */
    allowedUsers?: string[];
    /** Whether to log access attempts */
    logAccess?: boolean;
}
/**
 * Privacy compliance options
 */
export interface PrivacyOptions {
    /** Whether this is personal data under GDPR */
    isPersonalData?: boolean;
    /** Legal basis for processing */
    legalBasis?: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
    /** Data categories (GDPR Article 9) */
    specialCategories?: string[];
    /** Geographic restrictions */
    geoRestrictions?: string[];
}
/**
 * Security configuration for data operations
 */
export interface SecurityConfig {
    /** Access control settings */
    accessControl?: AccessControlOptions;
    /** Privacy compliance settings */
    privacy?: PrivacyOptions;
    /** Data retention policy */
    retention?: RetentionPolicy;
    /** Whether to encrypt the data */
    encrypt?: boolean;
    /** Encryption key to use (if different from default) */
    encryptionKey?: string;
}
/**
 * Access attempt log entry
 */
export interface AccessLog {
    /** When the access was attempted */
    timestamp: number;
    /** Who attempted to access */
    userId: string;
    /** What they tried to access */
    resourceId: string;
    /** Whether access was granted */
    granted: boolean;
    /** Why access was denied (if applicable) */
    reason?: string;
}
