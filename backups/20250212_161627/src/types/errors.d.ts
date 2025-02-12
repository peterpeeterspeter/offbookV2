export declare enum ScriptAnalysisErrorCode {
    INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT",
    FILE_SIZE_EXCEEDED = "FILE_SIZE_EXCEEDED",
    INVALID_OPERATION = "INVALID_OPERATION",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    PROCESSING_FAILED = "PROCESSING_FAILED",
    EXTRACTION_FAILED = "EXTRACTION_FAILED",
    ANALYSIS_FAILED = "ANALYSIS_FAILED",
    BATCH_PROCESSING_FAILED = "BATCH_PROCESSING_FAILED",
    API_REQUEST_FAILED = "API_REQUEST_FAILED",
    API_RESPONSE_INVALID = "API_RESPONSE_INVALID",
    API_RATE_LIMIT = "API_RATE_LIMIT",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    SERVICE_TIMEOUT = "SERVICE_TIMEOUT",
    INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    RESOURCE_LOCKED = "RESOURCE_LOCKED",
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
    RETRY_EXHAUSTED = "RETRY_EXHAUSTED",
    CLEANUP_FAILED = "CLEANUP_FAILED"
}
export interface ErrorDetails {
    code: ScriptAnalysisErrorCode;
    message: string;
    timestamp?: number;
    details?: Record<string, unknown> | undefined;
    originalError?: Error | undefined;
}
export declare class ScriptAnalysisError extends Error {
    readonly code: ScriptAnalysisErrorCode;
    readonly timestamp: number;
    readonly details?: Record<string, unknown> | undefined;
    readonly originalError?: Error | undefined;
    constructor({ code, message, details, originalError, timestamp }: ErrorDetails);
    toJSON(): {
        name: string;
        code: ScriptAnalysisErrorCode;
        message: string;
        timestamp: number;
        details: Record<string, unknown> | undefined;
        stack: string | undefined;
    };
}
export declare class ValidationError extends ScriptAnalysisError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ProcessingError extends ScriptAnalysisError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class APIError extends ScriptAnalysisError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare function createError(code: ScriptAnalysisErrorCode, message: string, details?: Record<string, unknown>): ScriptAnalysisError;
export declare function isScriptAnalysisError(error: unknown): error is ScriptAnalysisError;
