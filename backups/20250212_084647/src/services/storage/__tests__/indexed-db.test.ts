import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBEngine } from '../indexed-db';
import { StorableData } from '../types';

interface TestData extends StorableData {
  name: string;
  value: number;
}

describe('IndexedDBEngine', () => {
  let storage: IndexedDBEngine;
  let testData: TestData;

  beforeEach(async () => {
    // Clear IndexedDB
    const deleteRequest = indexedDB.deleteDatabase('app_storage');
    await new Promise<void>((resolve, reject) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });

    storage = new IndexedDBEngine();
    testData = {
      id: 'test-1',
      name: 'Test Item',
      value: 42,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  });

  afterEach(async () => {
    await storage.clear();
  });

  describe('Availability Check', () => {
    it('should detect when IndexedDB is available', () => {
      expect(storage.isAvailable).toBe(true);
    });

    it('should detect when IndexedDB is not available', () => {
      const originalIndexedDB = window.indexedDB;
      // @ts-expect-error - Intentionally removing indexedDB to test unavailability
      delete window.indexedDB;
      const newStorage = new IndexedDBEngine();
      expect(newStorage.isAvailable).toBe(false);
      window.indexedDB = originalIndexedDB;
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
      const keys = await storage.keys();
      expect(keys).toHaveLength(0);
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
        value: 'x'.repeat(10000), // Create large string
      };

      await storage.set('large', largeData, { compress: true });
      const retrieved = await storage.get<typeof largeData>('large');
      expect(retrieved).toEqual(largeData);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data', async () => {
      await storage.set('secret', testData, { encrypt: true });

      // Get raw data from IndexedDB to verify encryption
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('app_storage');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction('items', 'readonly');
      const store = transaction.objectStore('items');
      const getRequest = store.get('secret');

      const stored = await new Promise((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });

      expect((stored as any).encrypted).toBe(true);
      expect(typeof (stored as any).data).toBe('string');
      expect((stored as any).data).not.toContain(testData.name);

      // Verify decryption works
      const retrieved = await storage.get<TestData>('secret');
      expect(retrieved).toEqual(testData);

      db.close();
    });
  });

  describe('Priority and Space Management', () => {
    it('should store priority level', async () => {
      await storage.set('critical', testData, { priority: 'critical' });
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('app_storage');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction('items', 'readonly');
      const store = transaction.objectStore('items');
      const getRequest = store.get('critical');

      const stored = await new Promise((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });

      expect((stored as any).priority).toBe('critical');
      db.close();
    });

    it('should clear low priority items when space is needed', async () => {
      // Mock storage quota error
      const mockEstimate = vi.spyOn(navigator.storage, 'estimate')
        .mockImplementationOnce(() => Promise.reject(new Error('Storage full')))
        .mockImplementationOnce(() => Promise.resolve({ quota: 100, usage: 50 }));

      // Add low priority item
      await storage.set('low', testData, { priority: 'low' });

      // Add high priority item when "storage is full"
      await storage.set('high', testData, { priority: 'high' });

      // Low priority item should be removed
      const lowPriorityItem = await storage.get('low');
      expect(lowPriorityItem).toBeNull();

      // High priority item should be stored
      const highPriorityItem = await storage.get('high');
      expect(highPriorityItem).toEqual(testData);

      mockEstimate.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle database open failures', async () => {
      const mockOpenError = new Error('Failed to open database');
      const originalOpen = indexedDB.open;
      // @ts-expect-error - Mocking indexedDB.open for error testing
      indexedDB.open = vi.fn().mockImplementation(() => {
        const request = {} as IDBOpenDBRequest;
        setTimeout(() => {
          request.onerror?.(new Event('error'));
        }, 0);
        return request;
      });

      const newStorage = new IndexedDBEngine();
      await expect(newStorage.set('test', testData))
        .rejects.toThrow();

      indexedDB.open = originalOpen;
    });

    it('should handle transaction failures', async () => {
      // Mock transaction error
      const originalGetTransaction = storage['db'].transaction;
      storage['db'].transaction = vi.fn().mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      await expect(storage.set('test', testData))
        .rejects.toThrow('Transaction failed');

      storage['db'].transaction = originalGetTransaction;
    });

    it('should handle encryption failures gracefully', async () => {
      // Mock encryption to fail
      vi.mock('../encryption', () => ({
        encrypt: vi.fn().mockRejectedValue(new Error('Encryption failed')),
        decrypt: vi.fn(),
      }));

      await expect(storage.set('secret', testData, { encrypt: true }))
        .rejects.toThrow('Encryption failed');
    });
  });
});
