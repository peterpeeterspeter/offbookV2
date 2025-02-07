import Dexie, { Table } from 'dexie';
import { StorageEngine, StorageOptions, StorableData, CacheEntry } from './types';
import { compress, decompress } from './compression';
import { encrypt, decrypt } from './encryption';

interface DatabaseSchema {
  items: Table<CacheEntry<unknown>>;
}

class StorageDatabase extends Dexie {
  items!: Table<CacheEntry<unknown>>;

  constructor() {
    super('app_storage');
    this.version(1).stores({
      items: 'id, createdAt, updatedAt, version, expiresAt, priority',
    });
  }
}

export class IndexedDBEngine implements StorageEngine {
  readonly name = 'indexedDB';
  readonly maxSize = 50 * 1024 * 1024; // 50MB
  private db: StorageDatabase;

  constructor() {
    this.db = new StorageDatabase();
  }

  get isAvailable(): boolean {
    return !!window.indexedDB;
  }

  async get<T extends StorableData>(key: string): Promise<T | null> {
    try {
      const entry = await this.db.items.get(key);
      if (!entry) return null;

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      let data = entry.data;

      // Handle encrypted data
      if ((entry as any).encrypted) {
        data = await decrypt(data as string);
      }

      // Handle compressed data
      if ((entry as any).compressed) {
        data = await decompress(data as string);
      }

      return data as T;
    } catch (error) {
      console.error(`Error reading from IndexedDB:`, error);
      return null;
    }
  }

  async set<T extends StorableData>(
    key: string,
    value: T,
    options?: StorageOptions
  ): Promise<void> {
    try {
      let data: unknown = value;
      const metadata = {
        encrypted: false,
        compressed: false,
      };

      // Handle encryption
      if (options?.encrypt) {
        data = await encrypt(data);
        metadata.encrypted = true;
      }

      // Handle compression
      if (options?.compress) {
        data = await compress(data);
        metadata.compressed = true;
      }

      const entry: CacheEntry<unknown> = {
        id: key,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: value.version,
        priority: options?.priority || 'medium',
        expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
        ...metadata,
      };

      await this.db.items.put(entry);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Handle storage full - remove expired and low priority items
        await this.clearSpace();
        // Try again
        await this.set(key, value, options);
      } else {
        throw error;
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.db.items.delete(key);
  }

  async clear(): Promise<void> {
    await this.db.items.clear();
  }

  async keys(): Promise<string[]> {
    return await this.db.items.toCollection().primaryKeys() as string[];
  }

  private async clearSpace(): Promise<void> {
    // First, clear expired items
    const now = Date.now();
    await this.db.items
      .where('expiresAt')
      .below(now)
      .delete();

    // If still need space, remove low priority items
    const priorityOrder: StoragePriority[] = ['low', 'medium', 'high', 'critical'];
    for (const priority of priorityOrder) {
      await this.db.items
        .where('priority')
        .equals(priority)
        .delete();

      // Check if we have enough space now
      try {
        await navigator.storage.estimate();
        return;
      } catch {
        // Continue removing items
        continue;
      }
    }
  }
}
