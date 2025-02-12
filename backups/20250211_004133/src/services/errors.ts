export class DeepSeekError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: any;

  constructor(code: string, details: any, status: number) {
    const message = `DeepSeek API Error: ${code} (${status}) - ${JSON.stringify(details)}`;
    super(message);
    this.name = 'DeepSeekError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
