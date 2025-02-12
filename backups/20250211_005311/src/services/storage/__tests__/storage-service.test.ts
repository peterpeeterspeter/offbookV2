import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../storage-service';
import { StorableData, StorageEngine } from '../types';
import { LocalStorageEngine } from '../local-storage';
import { IndexedDBEngine } from '../indexed-db';

// Mock data
interface TestData extends StorableData {
  name: string;
  value: number;
}

const testData: TestData = {
  id: 'test-1',
  name: 'Test Item',
  value: 42,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
};

// Mock storage engine for testing
class MockStorageEngine implements StorageEngine {
  private store = new Map<string, any>();
  readonly name = 'mockStorage';
  readonly maxSize = 1024 * 1024;
  readonly isAvailable = true;

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

describe('StorageService', () => {
  let storage: StorageService;
  let mockEngine: MockStorageEngine;

  beforeEach(() => {
    // Clear localStorage and indexedDB before each test
    localStorage.clear();
    indexedDB.deleteDatabase('app_storage');

    mockEngine = new MockStorageEngine();
    storage = new StorageService();
    // @ts-ignore - Accessing private property for testing
    storage.engines = [mockEngine];

    // @ts-expect-error - Mock storage engine for testing
    mockEngine.get.mockImplementation(() => Promise.resolve(null));
    // @ts-expect-error - Mock storage engine for testing
    mockEngine.set.mockImplementation(() => Promise.resolve());
    // @ts-expect-error - Mock storage engine for testing
    mockEngine.delete.mockImplementation(() => Promise.resolve());
    // @ts-expect-error - Mock storage engine for testing
    mockEngine.clear.mockImplementation(() => Promise.resolve());
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', async () => {
      await storage.set('test', testData);
      const retrieved = await storage.get<TestData>('test');
      expect(retrieved).toEqual(testData);
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

  describe('Storage Options', () => {
    it('should handle encrypted data', async () => {
      await storage.set('secret', testData, { encrypt: true });
      const retrieved = await storage.get<TestData>('secret');
      expect(retrieved).toEqual(testData);
    });

    it('should handle compressed data', async () => {
      await storage.set('compressed', testData, { compress: true });
      const retrieved = await storage.get<TestData>('compressed');
      expect(retrieved).toEqual(testData);
    });

    it('should respect expiration time', async () => {
      await storage.set('expires', testData, { expiresIn: 100 }); // 100ms
      let retrieved = await storage.get<TestData>('expires');
      expect(retrieved).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      retrieved = await storage.get<TestData>('expires');
      expect(retrieved).toBeNull();
    });
  });

  describe('Storage Engine Selection', () => {
    let localEngine: LocalStorageEngine;
    let indexedDBEngine: IndexedDBEngine;

    beforeEach(() => {
      localEngine = new LocalStorageEngine();
      indexedDBEngine = new IndexedDBEngine();
      // @ts-ignore - Accessing private property for testing
      storage.engines = [indexedDBEngine, localEngine];
    });

    it('should use IndexedDB for critical data', async () => {
      const spy = vi.spyOn(indexedDBEngine, 'set');
      await storage.set('critical', testData, { priority: 'critical' });
      expect(spy).toHaveBeenCalled();
    });

    it('should fallback to localStorage if IndexedDB fails', async () => {
      const indexedDBSpy = vi.spyOn(indexedDBEngine, 'set')
        .mockRejectedValueOnce(new Error('Failed'));
      const localStorageSpy = vi.spyOn(localEngine, 'set');

      await storage.set('fallback', testData);
      expect(indexedDBSpy).toHaveBeenCalled();
      expect(localStorageSpy).toHaveBeenCalled();
    });
  });

  describe('Migration', () => {
    let sourceEngine: MockStorageEngine;
    let targetEngine: MockStorageEngine;

    beforeEach(() => {
      sourceEngine = new MockStorageEngine();
      targetEngine = new MockStorageEngine();
    });

    it('should migrate data between engines', async () => {
      // Setup source data
      await sourceEngine.set('test1', testData);
      await sourceEngine.set('test2', { ...testData, id: 'test-2' });

      // Perform migration
      await storage.migrate(sourceEngine, targetEngine);

      // Verify migration
      const sourceKeys = await sourceEngine.keys();
      expect(sourceKeys).toHaveLength(0);

      const targetKeys = await targetEngine.keys();
      expect(targetKeys).toHaveLength(2);

      const migratedData = await targetEngine.get<TestData>('test1');
      expect(migratedData).toEqual(testData);
    });

    it('should prevent concurrent migrations', async () => {
      const migrationPromise1 = storage.migrate(sourceEngine, targetEngine);
      const migrationPromise2 = storage.migrate(sourceEngine, targetEngine);

      await expect(migrationPromise1).resolves.not.toThrow();
      await expect(migrationPromise2).rejects.toThrow('Migration already in progress');
    });
  });

  describe('Error Handling', () => {
    it('should throw when no storage engine is available', async () => {
      // @ts-ignore - Accessing private property for testing
      storage.engines = [];
      await expect(storage.set('test', testData))
        .rejects.toThrow('No storage engine available');
    });

    it('should handle storage quota exceeded', async () => {
      const largeData = { ...testData, value: 'x'.repeat(1024 * 1024) }; // 1MB
      await expect(storage.set('large', largeData))
        .rejects.toThrow(/exceeds.*limit/);
    });

    it('should handle invalid data gracefully', async () => {
      // @ts-ignore - Testing with invalid data
      await expect(storage.set('invalid', null))
        .rejects.toThrow();

      const retrieved = await storage.get('invalid');
      expect(retrieved).toBeNull();
    });
  });
});
