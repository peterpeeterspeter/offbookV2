export declare class DeepSeekError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details: any;
    constructor(code: string, details: any, status: number);
}
export declare class StorageError extends Error {
    constructor(message: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
