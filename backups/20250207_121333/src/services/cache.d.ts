export declare class SimpleCache {
    private cache;
    private maxSize;
    private ttl;
    private _hits;
    private _misses;
    private _processedKeys;
    constructor(maxSize: number, ttlMs: number);
    set(key: string, value: any): void;
    get(key: string): any;
    clear(): void;
    get size(): number;
    get hits(): number;
    get misses(): number;
    keys(): string[];
    reset(): void;
}
export declare const cache: SimpleCache;
