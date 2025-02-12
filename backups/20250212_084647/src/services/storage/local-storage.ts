import { StorageEngine, StorageOptions, StorableData } from './types';
import { compress, decompress } from './compression';
import { encrypt, decrypt } from './encryption';

export class LocalStorageEngine implements StorageEngine {
  readonly name = 'localStorage';
  readonly maxSize = 5 * 1024 * 1024; // 5MB

  constructor(private prefix: string = '') {}

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

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(this.getKey(key));
      if (data === null) {
        return null;
      }
      try {
        const parsed = JSON.parse(data);

        // Check if data is encrypted
        if (parsed.encrypted) {
          const decrypted = await decrypt(parsed.data);
          if (decrypted === null || decrypted === undefined) {
            return null;
          }
          return decrypted as T;
        }

        // Check expiration
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          await this.delete(key);
          return null;
        }

        return parsed.data as T;
      } catch (error: unknown) {
        const e = error instanceof Error ? error : new Error(String(error));
        console.error(`Error parsing JSON data for key ${key}:`, e);
        return null;
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error(`Error reading from localStorage:`, e);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    try {
      const data = {
        data: value,
        createdAt: Date.now(),
        expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
        encrypted: false
      };

      // Handle encryption
      if (options.encrypt) {
        try {
          const encrypted = await encrypt(value);
          data.data = encrypted as unknown as T;
          data.encrypted = true;
        } catch (error) {
          console.error('Encryption failed:', error);
          throw new Error('Failed to encrypt data');
        }
      }

      // Try to store the data
      try {
        localStorage.setItem(this.getKey(key), JSON.stringify(data));
      } catch (error: unknown) {
        const e = error instanceof Error ? error : new Error(String(error));
        if (e.name === 'QuotaExceededError') {
          // Try to clear expired items and retry
          await this.clearExpired();
          try {
            localStorage.setItem(this.getKey(key), JSON.stringify(data));
            return;
          } catch (retryError: unknown) {
            const re = retryError instanceof Error ? retryError : new Error(String(retryError));
            throw new Error(`Storage quota exceeded even after clearing expired items: ${re.message}`);
          }
        }
        throw e;
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error(`Error writing to localStorage:`, e);
      throw new Error(`Failed to write to localStorage: ${e.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error(`Error deleting from localStorage:`, e);
      throw new Error(`Failed to delete from localStorage: ${e.message}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      for (const key of keys) {
        await this.delete(key);
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error(`Error clearing localStorage:`, e);
      throw new Error(`Failed to clear localStorage: ${e.message}`);
    }
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private async clearExpired(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          if (stored.expiresAt && stored.expiresAt < Date.now()) {
            await this.delete(key.replace(`${this.prefix}:`, ''));
          }
        } catch {
          // Skip invalid entries
          continue;
        }
      }
    }
  }
}
