import { PrivacyOptions, RetentionPolicy, SecurityMetadata } from './types';
/**
 * Service for managing privacy compliance and data protection
 */
export declare class PrivacyService {
    private consentStore;
    private retentionPolicies;
    /**
     * Records user consent for data processing
     */
    recordConsent(userId: string, purpose: string): void;
    /**
     * Withdraws user consent for data processing
     */
    withdrawConsent(userId: string, purpose: string): void;
    /**
     * Checks if user has given consent
     */
    hasConsent(userId: string, purpose: string): boolean;
    /**
     * Sets retention policy for a data category
     */
    setRetentionPolicy(category: string, policy: RetentionPolicy): void;
    /**
     * Gets retention policy for a data category
     */
    getRetentionPolicy(category: string): RetentionPolicy | undefined;
    /**
     * Checks if data can be stored based on privacy rules
     */
    canStoreData(userId: string, metadata: SecurityMetadata, options?: PrivacyOptions): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    /**
     * Checks if data should be deleted based on retention policy
     */
    shouldDelete(metadata: SecurityMetadata, category: string): boolean;
    /**
     * Gets user's geographic region (mock implementation)
     */
    private getUserRegion;
    /**
     * Handles data subject access request (DSAR)
     */
    handleDataRequest(userId: string, requestType: 'access' | 'delete' | 'rectify'): Promise<void>;
    /**
     * Generates privacy policy acceptance record
     */
    generatePrivacyRecord(userId: string): string;
}
