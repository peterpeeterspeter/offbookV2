import { StorageEngine, StorageOptions, StorableData } from './types';
export declare class LocalStorageEngine implements StorageEngine {
    readonly name = "localStorage";
    readonly maxSize: number;
    get isAvailable(): boolean;
    get<T extends StorableData>(key: string): Promise<T | null>;
    set<T extends StorableData>(key: string, value: T, options?: StorageOptions): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    private clearExpired;
}
