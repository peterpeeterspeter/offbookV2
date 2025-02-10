/**
 * Storage priority level to determine where data should be stored
 */
export type StoragePriority = 'critical' | 'high' | 'medium' | 'low';
/**
 * Storage options for data operations
 */
export interface StorageOptions {
    /** How important is this data (affects storage method and persistence) */
    priority?: StoragePriority;
    /** Time in milliseconds after which the data expires */
    expiresIn?: number;
    /** Whether to encrypt the data before storing */
    encrypt?: boolean;
    /** Whether to compress the data before storing */
    compress?: boolean;
}
/**
 * Base interface for all storable data
 */
export interface StorableData {
    id: string;
    createdAt: number;
    updatedAt: number;
    version: number;
}
/**
 * Storage engine capabilities
 */
export interface StorageEngine {
    readonly name: string;
    readonly maxSize: number;
    isAvailable: boolean;
    get<T extends StorableData>(key: string): Promise<T | null>;
    set<T extends StorableData>(key: string, value: T, options?: StorageOptions): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
}
/**
 * Migration definition
 */
export interface Migration {
    version: number;
    up: () => Promise<void>;
    down: () => Promise<void>;
}
/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> extends StorableData {
    data: T;
    expiresAt?: number;
    priority: StoragePriority;
}
/**
 * Storage statistics
 */
export interface StorageStats {
    totalSize: number;
    usedSize: number;
    itemCount: number;
    oldestItem?: StorableData;
    newestItem?: StorableData;
}
