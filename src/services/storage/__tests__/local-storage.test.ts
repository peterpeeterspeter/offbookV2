import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalStorageEngine } from '../local-storage';
import { StorableData } from '../types';
import * as encryption from '../encryption';

vi.mock('../encryption');

interface TestData extends StorableData {
  name: string;
  value: number;
}

describe('LocalStorageEngine', () => {
  let storage: LocalStorageEngine;
  let testData: TestData;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalStorageEngine();
    testData = {
      id: 'test-1',
      name: 'Test Item',
      value: 42,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    // Reset encryption mocks
    vi.mocked(encryption.encrypt).mockImplementation(async (data) => {
      if (data === undefined) return 'undefined';
      if (data === null) return 'null';
      // Simulate AES encryption with a more realistic mock
      const jsonString = JSON.stringify(data);
      return `AES_ENCRYPTED:${Buffer.from(jsonString).toString('base64')}`;
    });
    vi.mocked(encryption.decrypt).mockImplementation(async (data) => {
      if (data === 'undefined') return undefined;
      if (data === 'null') return null;
      if (!data.startsWith('AES_ENCRYPTED:')) {
        throw new Error('Failed to decrypt data');
      }
      try {
        const base64Data = data.replace('AES_ENCRYPTED:', '');
        return JSON.parse(Buffer.from(base64Data, 'base64').toString());
      } catch {
        throw new Error('Failed to decrypt data');
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Availability Check', () => {
    it('should detect when localStorage is available', () => {
      expect(storage.isAvailable).toBe(true);
    });

    it('should detect when localStorage is not available', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-expect-error - Mocking localStorage unavailability
      delete window.localStorage;
      const newStorage = new LocalStorageEngine();
      expect(newStorage.isAvailable).toBe(false);
      window.localStorage = originalLocalStorage;
    });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', async () => {
      await storage.set('test', testData);
      const retrieved = await storage.get<TestData>('test');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await storage.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete data', async () => {
      await storage.set('test', testData);
      await storage.delete('test');
      const retrieved = await storage.get('test');
      expect(retrieved).toBeNull();
    });

    it('should clear all data', async () => {
      await storage.set('test1', testData);
      await storage.set('test2', { ...testData, id: 'test-2' });
      await storage.clear();
      expect(localStorage.length).toBe(0);
    });

    it('should list all keys', async () => {
      await storage.set('test1', testData);
      await storage.set('test2', { ...testData, id: 'test-2' });
      const keys = await storage.keys();
      expect(keys).toContain('test1');
      expect(keys).toContain('test2');
    });
  });

  describe('Data Compression', () => {
    it('should compress and decompress data', async () => {
      const largeData = {
        ...testData,
        value: 'x'.repeat(1000), // Create large string
      };

      await storage.set('large', largeData, { compress: true });
      const retrieved = await storage.get<typeof largeData>('large');
      expect(retrieved).toEqual(largeData);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data', async () => {
      await storage.set('secret', testData, { encrypt: true });

      // Verify data is encrypted in localStorage
      const raw = localStorage.getItem('secret');
      const stored = JSON.parse(raw!);
      expect(stored.encrypted).toBe(true);
      expect(typeof stored.data).toBe('string');
      expect(stored.data).not.toContain(testData.name);

      // Verify decryption works
      const retrieved = await storage.get<TestData>('secret');
      expect(retrieved).toEqual(testData);
    });
  });

  describe('Expiration', () => {
    it('should handle data expiration', async () => {
      await storage.set('expires', testData, { expiresIn: 100 }); // 100ms

      // Data should be available immediately
      let retrieved = await storage.get<TestData>('expires');
      expect(retrieved).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Data should be expired
      retrieved = await storage.get<TestData>('expires');
      expect(retrieved).toBeNull();
    });

    it('should clear expired items when storage is full', async () => {
      const mockQuotaError = new Error('QuotaExceededError');
      mockQuotaError.name = 'QuotaExceededError';

      // Create a safe mock implementation
      const storedItems = new Map<string, string>();
      const mockLocalStorage = {
        setItem: vi.fn().mockImplementation((key: string, value: string) => {
          if (!hasThrown) {
            hasThrown = true;
            throw mockQuotaError;
          }
          storedItems.set(key, value);
        }),
        getItem: vi.fn().mockImplementation((key: string) => storedItems.get(key) || null),
        removeItem: vi.fn().mockImplementation((key: string) => storedItems.delete(key)),
        clear: vi.fn().mockImplementation(() => storedItems.clear()),
        key: vi.fn(),
        length: 0
      };

      // Replace localStorage methods
      const originalLocalStorage = { ...window.localStorage };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      let hasThrown = false;

      // Set expired item
      await storage.set('expired', testData, { expiresIn: -1 }); // Already expired

      // Set new item - should trigger cleanup
      await storage.set('new', testData);

      // Verify expired item was cleaned up
      const expiredItem = await storage.get('expired');
      expect(expiredItem).toBeNull();

      // Verify new item was stored
      const newItem = await storage.get('new');
      expect(newItem).toEqual(testData);

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage
      });
    });

    it('should handle storage quota exceeded', async () => {
      const mockQuotaError = new Error('QuotaExceededError');
      mockQuotaError.name = 'QuotaExceededError';

      // Create a safe mock implementation
      const storedItems = new Map<string, string>();
      const mockLocalStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw mockQuotaError;
        }),
        getItem: vi.fn().mockImplementation((key: string) => storedItems.get(key) || null),
        removeItem: vi.fn().mockImplementation((key: string) => storedItems.delete(key)),
        clear: vi.fn().mockImplementation(() => storedItems.clear()),
        key: vi.fn(),
        length: 0
      };

      // Replace localStorage methods
      const originalLocalStorage = { ...window.localStorage };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
        writable: true
      });

      const largeData = {
        ...testData,
        value: 'x'.repeat(storage.maxSize), // Exceed storage limit
      };

      await expect(storage.set('large', largeData))
        .rejects.toThrow('Failed to write to localStorage: Data size exceeds localStorage limit');

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON data', async () => {
      localStorage.setItem('invalid', 'not-json');
      const retrieved = await storage.get('invalid');
      expect(retrieved).toBeNull();
    });

    it('should handle encryption failures gracefully', async () => {
      // Mock encryption to fail
      vi.mocked(encryption.encrypt).mockRejectedValueOnce(new Error('Encryption failed'));

      await expect(storage.set('secret', testData, { encrypt: true }))
        .rejects.toThrow('Failed to encrypt data');

      // Verify no data was written to localStorage
      expect(localStorage.getItem('secret')).toBeNull();
    });
  });
});
