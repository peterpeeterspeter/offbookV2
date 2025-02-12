import { StorageEngine, StorageOptions, StorableData } from './types';
export declare class StorageService {
    private engines;
    private migrationInProgress;
    constructor();
    /**
     * Stores data using the most appropriate storage engine
     */
    set<T extends StorableData>(key: string, value: T, options?: StorageOptions): Promise<void>;
    /**
     * Retrieves data from storage
     */
    get<T extends StorableData>(key: string): Promise<T | null>;
    /**
     * Deletes data from all storage engines
     */
    delete(key: string): Promise<void>;
    /**
     * Clears all storage
     */
    clear(): Promise<void>;
    /**
     * Gets all stored keys across all engines
     */
    keys(): Promise<string[]>;
    /**
     * Migrates data between storage engines
     */
    migrate(fromEngine: StorageEngine, toEngine: StorageEngine): Promise<void>;
    /**
     * Selects the most appropriate storage engine based on priority
     */
    private selectEngine;
}
export declare const storage: StorageService;
