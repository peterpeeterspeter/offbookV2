export enum ScriptAnalysisErrorCode {
  // Validation Errors (1000-1999)
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED',
  INVALID_OPERATION = 'INVALID_OPERATION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_SESSION = 'INVALID_SESSION',

  // Processing Errors (2000-2999)
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  BATCH_PROCESSING_FAILED = 'BATCH_PROCESSING_FAILED',

  // API Errors (3000-3999)
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',
  API_RATE_LIMIT = 'API_RATE_LIMIT',

  // Service Errors (4000-4999)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',

  // Resource Errors (5000-5999)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  CLEANUP_FAILED = 'CLEANUP_FAILED'
}

export interface ErrorDetails {
  code: ScriptAnalysisErrorCode;
  message: string;
  timestamp?: number;
  details?: Record<string, unknown> | undefined;
  originalError?: Error | undefined;
}

export class ScriptAnalysisError extends Error {
  readonly code: ScriptAnalysisErrorCode;
  readonly timestamp: number;
  readonly details?: Record<string, unknown> | undefined;
  readonly originalError?: Error | undefined;

  constructor({ code, message, details, originalError, timestamp }: ErrorDetails) {
    super(message);
    this.name = 'ScriptAnalysisError';
    this.code = code;
    this.timestamp = timestamp ?? Date.now();
    this.details = details;
    this.originalError = originalError;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack
    };
  }
}

export class ValidationError extends ScriptAnalysisError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: ScriptAnalysisErrorCode.INVALID_FILE_FORMAT,
      message,
      details,
      timestamp: Date.now()
    });
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends ScriptAnalysisError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
      message,
      details,
      timestamp: Date.now()
    });
    this.name = 'ProcessingError';
  }
}

export class APIError extends ScriptAnalysisError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: ScriptAnalysisErrorCode.API_REQUEST_FAILED,
      message,
      details,
      timestamp: Date.now()
    });
    this.name = 'APIError';
  }
}

export function createError(
  code: ScriptAnalysisErrorCode,
  message: string,
  details?: Record<string, unknown>
): ScriptAnalysisError {
  return new ScriptAnalysisError({
    code,
    message,
    details,
    timestamp: Date.now()
  });
}

export function isScriptAnalysisError(error: unknown): error is ScriptAnalysisError {
  return error instanceof ScriptAnalysisError;
}

