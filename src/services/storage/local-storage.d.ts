import { StorageEngine, StorageOptions } from './types';
export declare class LocalStorageEngine implements StorageEngine {
    private prefix;
    readonly name = "localStorage";
    readonly maxSize: number;
    constructor(prefix?: string);
    get isAvailable(): boolean;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    private getKey;
    private clearExpired;
}
