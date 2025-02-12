import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EncryptionService } from '../encryption';
import { AccessControlService } from '../access-control';
import { PrivacyService } from '../privacy';
import { DataCleanupService } from '../cleanup';
import { SecurityMetadata, UserRole } from '../types';

describe('Security Services', () => {
  describe('EncryptionService', () => {
    let encryptionService: EncryptionService;
    const testKey = 'test-encryption-key-32-bytes-long!!';

    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY = testKey;
      encryptionService = new EncryptionService();
    });

    it('should encrypt and decrypt data', async () => {
      const testData = { id: 1, name: 'test' };
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should produce different ciphertexts for same data', async () => {
      const testData = { id: 1, name: 'test' };
      const encrypted1 = await encryptionService.encrypt(testData);
      const encrypted2 = await encryptionService.encrypt(testData);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle key rotation', async () => {
      const testData = { id: 1, name: 'test' };
      const encrypted = await encryptionService.encrypt(testData);
      const newKey = 'new-encryption-key-32-bytes-long!!';
      const reEncrypted = await encryptionService.rotateKey(encrypted, newKey);

      // Should not decrypt with old key
      await expect(encryptionService.decrypt(reEncrypted))
        .rejects.toThrow();

      // Should decrypt with new key
      const newService = new EncryptionService(newKey);
      const decrypted = await newService.decrypt(reEncrypted);
      expect(decrypted).toEqual(testData);
    });
  });

  describe('AccessControlService', () => {
    let accessControl: AccessControlService;
    const testMetadata: SecurityMetadata = {
      accessLevel: 'private',
      createdBy: 'user1',
      createdAt: Date.now(),
      encryptionVersion: 1,
      integrityHash: 'hash'
    };

    beforeEach(() => {
      accessControl = new AccessControlService();
    });

    it('should deny access without user context', async () => {
      const result = await accessControl.canAccess('resource1', testMetadata);
      expect(result).toBe(false);
    });

    it('should allow access to resource owner', async () => {
      accessControl.setUser('user1', 'user');
      const result = await accessControl.canAccess('resource1', testMetadata);
      expect(result).toBe(true);
    });

    it('should respect role hierarchy', async () => {
      accessControl.setUser('user2', 'admin');
      const result = await accessControl.canAccess('resource1', testMetadata, {
        requiredRole: 'user'
      });
      expect(result).toBe(true);
    });

    it('should log access attempts', async () => {
      accessControl.setUser('user3', 'guest');
      await accessControl.canAccess('resource1', testMetadata);
      const logs = accessControl.getAccessLogs({ userId: 'user3' });
      expect(logs).toHaveLength(1);
      expect(logs[0].granted).toBe(false);
    });
  });

  describe('PrivacyService', () => {
    let privacy: PrivacyService;
    const testMetadata: SecurityMetadata = {
      accessLevel: 'private',
      createdBy: 'user1',
      createdAt: Date.now(),
      encryptionVersion: 1,
      integrityHash: 'hash'
    };

    beforeEach(() => {
      privacy = new PrivacyService();
    });

    it('should require consent for personal data', async () => {
      const result = await privacy.canStoreData('user1', testMetadata, {
        isPersonalData: true
      });
      expect(result.allowed).toBe(false);
    });

    it('should allow storage after consent', async () => {
      privacy.recordConsent('user1', 'data_storage');
      const result = await privacy.canStoreData('user1', testMetadata, {
        isPersonalData: true,
        legalBasis: 'consent'
      });
      expect(result.allowed).toBe(true);
    });

    it('should handle consent withdrawal', () => {
      privacy.recordConsent('user1', 'data_storage');
      expect(privacy.hasConsent('user1', 'data_storage')).toBe(true);

      privacy.withdrawConsent('user1', 'data_storage');
      expect(privacy.hasConsent('user1', 'data_storage')).toBe(false);
    });

    it('should enforce retention policies', () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      privacy.setRetentionPolicy('test', { duration: 1000 });
      const shouldDelete = privacy.shouldDelete(testMetadata, 'test');
      expect(shouldDelete).toBe(false);

      vi.advanceTimersByTime(1500);
      const shouldDeleteNow = privacy.shouldDelete(testMetadata, 'test');
      expect(shouldDeleteNow).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('DataCleanupService', () => {
    let cleanup: DataCleanupService;
    const deleteData = vi.fn().mockResolvedValue(undefined);
    const archiveData = vi.fn().mockResolvedValue(undefined);
    const testMetadata: SecurityMetadata = {
      accessLevel: 'private',
      createdBy: 'user1',
      createdAt: Date.now(),
      encryptionVersion: 1,
      integrityHash: 'hash'
    };

    beforeEach(() => {
      cleanup = new DataCleanupService(deleteData, archiveData);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('should schedule cleanup tasks', () => {
      cleanup.scheduleCleanup('resource1', testMetadata, {
        duration: 1000
      });
      const tasks = cleanup.getPendingTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].resourceId).toBe('resource1');
    });

    it('should run cleanup at scheduled time', async () => {
      cleanup.scheduleCleanup('resource1', testMetadata, {
        duration: 1000
      });
      cleanup.start(100);

      vi.advanceTimersByTime(1100);
      expect(deleteData).toHaveBeenCalledWith('resource1');
    });

    it('should archive instead of delete when specified', async () => {
      cleanup.scheduleCleanup('resource1', testMetadata, {
        duration: 1000,
        archive: true
      });
      cleanup.start(100);

      vi.advanceTimersByTime(1100);
      expect(archiveData).toHaveBeenCalledWith('resource1');
      expect(deleteData).not.toHaveBeenCalled();
    });

    it('should handle cleanup failures with retry', async () => {
      deleteData.mockRejectedValueOnce(new Error('Failed'));

      cleanup.scheduleCleanup('resource1', testMetadata, {
        duration: 1000
      });
      cleanup.start(100);

      // First attempt
      vi.advanceTimersByTime(1100);
      expect(deleteData).toHaveBeenCalledTimes(1);

      // Should be rescheduled
      const tasks = cleanup.getPendingTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toMatch(/_retry1$/);
    });
  });
});
