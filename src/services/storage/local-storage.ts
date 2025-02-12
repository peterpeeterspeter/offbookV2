import { StorageEngine, StorageOptions } from './types';
import { encrypt, decrypt } from './encryption';

export class LocalStorageEngine implements StorageEngine {
  readonly name = 'localStorage';
  readonly maxSize = 5 * 1024 * 1024; // 5MB
  private quotaWarningThreshold = 0.9; // 90% of maxSize

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
        // Validate JSON before parsing
        if (!this.isValidJSON(data)) {
          console.warn(`Invalid JSON data for key ${key}`);
          return null;
        }

        const parsed = JSON.parse(data);

        // Validate parsed data structure
        if (!this.isValidStorageData(parsed)) {
          console.warn(`Invalid storage data structure for key ${key}`);
          return null;
        }

        // Check expiration
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          await this.delete(key);
          return null;
        }

        // Handle decryption
        if (parsed.encrypted) {
          try {
            const decrypted = await decrypt(parsed.data);
            if (decrypted === null || decrypted === undefined) {
              return null;
            }
            return decrypted as T;
          } catch (error) {
            console.error('Decryption failed:', error);
            await this.delete(key); // Clean up corrupted data
            return null;
          }
        }

        return parsed.data as T;
      } catch (error: unknown) {
        const e = error instanceof Error ? error : new Error(String(error));
        console.error(`Error parsing JSON data for key ${key}:`, e);
        return null;
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error('Error reading from localStorage:', e);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    try {
      // Check available space before processing
      const availableSpace = await this.getAvailableSpace();
      const estimatedSize = this.estimateSize(value);

      if (estimatedSize > this.maxSize) {
        throw new Error('Data size exceeds localStorage limit');
      }

      if (estimatedSize > availableSpace) {
        // Try to free up space
        await this.clearExpired();
        const newAvailableSpace = await this.getAvailableSpace();
        if (estimatedSize > newAvailableSpace) {
          throw new Error('Insufficient storage space available');
        }
      }

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
          if (!encrypted) {
            throw new Error('Encryption returned null or undefined');
          }
          data.data = encrypted as unknown as T;
          data.encrypted = true;
        } catch (error) {
          console.error('Encryption failed:', error);
          throw new Error('Failed to encrypt data');
        }
      }

      // Try to store the data
      try {
        const serializedData = JSON.stringify(data);

        try {
          localStorage.setItem(this.getKey(key), serializedData);
        } catch (error: unknown) {
          const e = error instanceof Error ? error : new Error(String(error));
          if (e.name === 'QuotaExceededError') {
            // Try to clear expired items
            await this.clearExpired();
            try {
              localStorage.setItem(this.getKey(key), serializedData);
            } catch (retryError: unknown) {
              throw new Error('Storage quota exceeded even after clearing expired items');
            }
          } else {
            throw e;
          }
        }
      } catch (error: unknown) {
        const e = error instanceof Error ? error : new Error(String(error));
        throw new Error(`Failed to write to localStorage: ${e.message}`);
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error('Error writing to localStorage:', e);
      throw e;
    }
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private isValidStorageData(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const requiredKeys = ['data', 'createdAt'];
    return requiredKeys.every(key => key in (data as Record<string, unknown>));
  }

  private async getAvailableSpace(): Promise<number> {
    try {
      const testKey = '__size_test__';
      const oneKB = 'x'.repeat(1024);
      let i = 0;

      while (true) {
        try {
          localStorage.setItem(testKey, oneKB.repeat(i));
          i++;
        } catch {
          localStorage.removeItem(testKey);
          return (i - 1) * 1024;
        }
      }
    } catch {
      return 0;
    }
  }

  private estimateSize(value: unknown): number {
    try {
      return new Blob([JSON.stringify({ data: value })]).size;
    } catch {
      return Number.MAX_SAFE_INTEGER; // Assume too large if can't estimate
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
