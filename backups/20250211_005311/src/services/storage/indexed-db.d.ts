import { StorageEngine, StorageOptions, StorableData } from './types';
export declare class IndexedDBEngine implements StorageEngine {
    readonly name = "indexedDB";
    readonly maxSize: number;
    private db;
    constructor();
    get isAvailable(): boolean;
    get<T extends StorableData>(key: string): Promise<T | null>;
    set<T extends StorableData>(key: string, value: T, options?: StorageOptions): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    private clearSpace;
}
