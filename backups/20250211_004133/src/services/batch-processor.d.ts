interface BatchProcessorOptions {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
}
export declare class BatchProcessor<T> {
    private processFn;
    private options;
    private queue;
    private processing;
    private timer;
    constructor(processFn: (items: T[]) => Promise<void>, options: BatchProcessorOptions);
    add(data: T, priority?: number): Promise<void>;
    private startProcessing;
    clear(): void;
}
export {};
