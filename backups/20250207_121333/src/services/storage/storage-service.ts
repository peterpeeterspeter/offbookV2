import { StorageEngine, StorageOptions, StorableData, StoragePriority } from './types';
import { LocalStorageEngine } from './local-storage';
import { IndexedDBEngine } from './indexed-db';

export class StorageService {
  private engines: StorageEngine[] = [];
  private migrationInProgress = false;

  constructor() {
    // Initialize storage engines in order of preference
    this.engines = [
      new IndexedDBEngine(),
      new LocalStorageEngine(),
    ].filter(engine => engine.isAvailable);
  }

  /**
   * Stores data using the most appropriate storage engine
   */
  async set<T extends StorableData>(
    key: string,
    value: T,
    options?: StorageOptions
  ): Promise<void> {
    const engine = this.selectEngine(options?.priority);
    if (!engine) {
      throw new Error('No storage engine available');
    }

    try {
      await engine.set(key, value, options);
    } catch (error) {
      // If primary engine fails, try fallback engines
      const fallbackEngines = this.engines.filter(e => e !== engine);
      for (const fallback of fallbackEngines) {
        try {
          await fallback.set(key, value, options);
          return;
        } catch {
          continue;
        }
      }
      throw error;
    }
  }

  /**
   * Retrieves data from storage
   */
  async get<T extends StorableData>(key: string): Promise<T | null> {
    // Try all engines in order until we find the data
    for (const engine of this.engines) {
      try {
        const value = await engine.get<T>(key);
        if (value) return value;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Deletes data from all storage engines
   */
  async delete(key: string): Promise<void> {
    await Promise.all(
      this.engines.map(engine => engine.delete(key).catch(() => {}))
    );
  }

  /**
   * Clears all storage
   */
  async clear(): Promise<void> {
    await Promise.all(
      this.engines.map(engine => engine.clear().catch(() => {}))
    );
  }

  /**
   * Gets all stored keys across all engines
   */
  async keys(): Promise<string[]> {
    const allKeys = await Promise.all(
      this.engines.map(engine => engine.keys().catch(() => []))
    );
    return [...new Set(allKeys.flat())];
  }

  /**
   * Migrates data between storage engines
   */
  async migrate(
    fromEngine: StorageEngine,
    toEngine: StorageEngine
  ): Promise<void> {
    if (this.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    this.migrationInProgress = true;
    try {
      const keys = await fromEngine.keys();
      for (const key of keys) {
        const value = await fromEngine.get(key);
        if (value) {
          await toEngine.set(key, value);
          await fromEngine.delete(key);
        }
      }
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Selects the most appropriate storage engine based on priority
   */
  private selectEngine(priority: StoragePriority = 'medium'): StorageEngine | null {
    if (priority === 'critical' || priority === 'high') {
      // Use IndexedDB for important data
      return this.engines.find(e => e instanceof IndexedDBEngine) || this.engines[0];
    }

    // Use any available engine for other data
    return this.engines[0] || null;
  }
}

// Export singleton instance
export const storage = new StorageService();
