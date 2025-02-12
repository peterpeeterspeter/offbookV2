export declare class SimpleCache {
    private cache;
    private maxSize;
    private ttl;
    constructor(maxSize: number, ttlMs: number);
    set(key: string, value: any): void;
    get(key: string): any;
    clear(): void;
    get size(): number;
    keys(): string[];
}
