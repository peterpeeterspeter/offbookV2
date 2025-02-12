import { StorageService } from '../storage-service';
import { StorableData, StorageEngine, StorageOptions } from '../types';

// Mock data
interface TestData extends StorableData {
  name: string;
  value: number;
}

const mockData: TestData = {
  id: 'test-1',
  name: 'Test Item',
  value: 42,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1
};

// Mock storage engine
class MockStorageEngine implements StorageEngine {
  private store: Map<string, any> = new Map();
  readonly name = 'mockStorage';
  readonly maxSize = 1024 * 1024; // 1MB
  isAvailable = true;

  async get<T extends StorableData>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set<T extends StorableData>(key: string, value: T, options?: StorageOptions): Promise<void> {
    if (options?.priority === 'critical' && !this.isAvailable) {
      throw new Error('Storage not available');
    }
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
  let service: StorageService;
  let mockEngine: MockStorageEngine;

  beforeEach(() => {
    mockEngine = new MockStorageEngine();
    service = new StorageService();
    // @ts-expect-error Accessing private property for testing
    service.engines = [mockEngine];
  });

  afterEach(async () => {
    await service.clear();
  });

  it('should store and retrieve data', async () => {
    await service.set(mockData.id, mockData);
    const retrieved = await service.get<TestData>(mockData.id);
    expect(retrieved).toEqual(mockData);
  });

  it('should handle non-existent data', async () => {
    const retrieved = await service.get<TestData>('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should delete data', async () => {
    await service.set(mockData.id, mockData);
    await service.delete(mockData.id);
    const retrieved = await service.get<TestData>(mockData.id);
    expect(retrieved).toBeNull();
  });

  it('should clear all data', async () => {
    await service.set(mockData.id, mockData);
    await service.set('test-2', { ...mockData, id: 'test-2' });
    await service.clear();
    const keys = await service.keys();
    expect(keys).toHaveLength(0);
  });

  it('should list all keys', async () => {
    const items = [
      mockData,
      { ...mockData, id: 'test-2', value: 43 },
      { ...mockData, id: 'test-3', value: 44 },
    ];

    for (const item of items) {
      await service.set(item.id, item);
    }

    const keys = await service.keys();
    expect(keys).toHaveLength(items.length);
    expect(keys).toEqual(expect.arrayContaining(items.map(item => item.id)));
  });

  it('should handle storage errors', async () => {
    mockEngine.isAvailable = false;
    let error: Error | null = null;

    try {
      await service.set(mockData.id, mockData, { priority: 'critical' });
      expect('This line should not be reached').toBe(false);
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect(error?.message).toBe('Storage not available');
  });

  it('should handle concurrent operations', async () => {
    const operations = [
      service.set('1', { ...mockData, id: '1' }),
      service.set('2', { ...mockData, id: '2' }),
      service.get<TestData>('1'),
      service.delete('2'),
    ];

    await expect(Promise.all(operations)).resolves.toBeDefined();
  });

  describe('Storage Engine Integration', () => {
    it('should work with default storage engines', async () => {
      const defaultService = new StorageService();
      await defaultService.set(mockData.id, mockData);
      const retrieved = await defaultService.get<TestData>(mockData.id);
      expect(retrieved).toEqual(mockData);
      await defaultService.clear();
    });
  });
});
