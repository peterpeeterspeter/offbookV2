import { StorageEngine, StorageOptions, StorableData } from './types';
import { compress, decompress } from './compression';
import { encrypt, decrypt } from './encryption';

export class LocalStorageEngine implements StorageEngine {
  readonly name = 'localStorage';
  readonly maxSize = 5 * 1024 * 1024; // 5MB

  get isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  async get<T extends StorableData>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // Parse the stored data
      const stored = JSON.parse(raw);

      // Check expiration first
      if (stored.expiresAt && stored.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      let data = stored.data;

      // Handle encrypted data
      if (stored.encrypted) {
        data = await decrypt(data);
      }

      // Handle compressed data
      if (stored.compressed) {
        data = await decompress(data);
      }

      return data as T;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return null;
    }
  }

  async set<T extends StorableData>(
    key: string,
    value: T,
    options?: StorageOptions
  ): Promise<void> {
    try {
      let data = value;
      const metadata = {
        encrypted: false,
        compressed: false,
        expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      };

      // Handle encryption first
      if (options?.encrypt) {
        data = await encrypt(data) as T;
        metadata.encrypted = true;
      }

      // Handle compression after encryption
      if (options?.compress) {
        data = await compress(data) as T;
        metadata.compressed = true;
      }

      const stored = {
        ...metadata,
        data,
        updatedAt: Date.now(),
      };

      // Check size before storing
      const serialized = JSON.stringify(stored);
      if (serialized.length > this.maxSize) {
        throw new Error(`Data size exceeds localStorage limit of ${this.maxSize} bytes`);
      }

      try {
        localStorage.setItem(key, serialized);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Handle storage full - remove expired items
          await this.clearExpired();
          // Try again
          localStorage.setItem(key, serialized);
        } else {
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to store data: ${error.message}`);
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  }

  private async clearExpired(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          if (stored.expiresAt && stored.expiresAt < Date.now()) {
            await this.delete(key);
          }
        } catch {
          // Skip invalid entries
          continue;
        }
      }
    }
  }
}
