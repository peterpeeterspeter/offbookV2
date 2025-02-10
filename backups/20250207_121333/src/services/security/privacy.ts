import { PrivacyOptions, RetentionPolicy, SecurityMetadata } from './types';

/**
 * Service for managing privacy compliance and data protection
 */
export class PrivacyService {
  private consentStore = new Map<string, Set<string>>();
  private retentionPolicies = new Map<string, RetentionPolicy>();

  /**
   * Records user consent for data processing
   */
  recordConsent(userId: string, purpose: string): void {
    if (!this.consentStore.has(userId)) {
      this.consentStore.set(userId, new Set());
    }
    this.consentStore.get(userId)!.add(purpose);
  }

  /**
   * Withdraws user consent for data processing
   */
  withdrawConsent(userId: string, purpose: string): void {
    this.consentStore.get(userId)?.delete(purpose);
  }

  /**
   * Checks if user has given consent
   */
  hasConsent(userId: string, purpose: string): boolean {
    return this.consentStore.get(userId)?.has(purpose) || false;
  }

  /**
   * Sets retention policy for a data category
   */
  setRetentionPolicy(category: string, policy: RetentionPolicy): void {
    this.retentionPolicies.set(category, policy);
  }

  /**
   * Gets retention policy for a data category
   */
  getRetentionPolicy(category: string): RetentionPolicy | undefined {
    return this.retentionPolicies.get(category);
  }

  /**
   * Checks if data can be stored based on privacy rules
   */
  async canStoreData(
    userId: string,
    metadata: SecurityMetadata,
    options?: PrivacyOptions
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if data requires consent
    if (options?.isPersonalData) {
      const hasConsent = this.hasConsent(userId, 'data_storage');
      if (!hasConsent) {
        return {
          allowed: false,
          reason: 'User consent required for personal data storage'
        };
      }
    }

    // Check special categories (sensitive data under GDPR)
    if (options?.specialCategories?.length) {
      for (const category of options.specialCategories) {
        const hasSpecialConsent = this.hasConsent(userId, `special_category_${category}`);
        if (!hasSpecialConsent) {
          return {
            allowed: false,
            reason: `Explicit consent required for special category: ${category}`
          };
        }
      }
    }

    // Check geographic restrictions
    if (options?.geoRestrictions?.length) {
      const userRegion = await this.getUserRegion(userId);
      if (options.geoRestrictions.includes(userRegion)) {
        return {
          allowed: false,
          reason: `Data storage restricted in region: ${userRegion}`
        };
      }
    }

    // Check legal basis
    if (options?.isPersonalData && !options.legalBasis) {
      return {
        allowed: false,
        reason: 'Legal basis required for personal data processing'
      };
    }

    return { allowed: true };
  }

  /**
   * Checks if data should be deleted based on retention policy
   */
  shouldDelete(metadata: SecurityMetadata, category: string): boolean {
    const policy = this.retentionPolicies.get(category);
    if (!policy) return false;

    const age = Date.now() - metadata.createdAt;
    return age >= policy.duration;
  }

  /**
   * Gets user's geographic region (mock implementation)
   */
  private async getUserRegion(userId: string): Promise<string> {
    // In a real implementation, this would determine the user's region
    // based on IP address, user profile, or other data
    return 'EU';
  }

  /**
   * Handles data subject access request (DSAR)
   */
  async handleDataRequest(
    userId: string,
    requestType: 'access' | 'delete' | 'rectify'
  ): Promise<void> {
    switch (requestType) {
      case 'access':
        // Implement data access request
        // Return all personal data associated with the user
        break;
      case 'delete':
        // Implement right to be forgotten
        // Delete all personal data associated with the user
        this.consentStore.delete(userId);
        break;
      case 'rectify':
        // Implement data rectification
        // Allow updating personal data
        break;
    }
  }

  /**
   * Generates privacy policy acceptance record
   */
  generatePrivacyRecord(userId: string): string {
    const timestamp = new Date().toISOString();
    const consents = Array.from(this.consentStore.get(userId) || []);

    return JSON.stringify({
      userId,
      timestamp,
      consents,
      version: '1.0'
    });
  }
}
