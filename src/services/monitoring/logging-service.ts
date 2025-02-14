import winston from 'winston';
import { monitoringConfig } from '@/config/monitoring';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  context?: Record<string, unknown>;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export class LoggingService {
  private static instance: LoggingService;
  private logger: winston.Logger;
  private readonly logRetentionDays = 90;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata(),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'offbook-v2',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: this.configureTransports()
    });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private configureTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }

    // File transport for production
    if (process.env.NODE_ENV === 'production') {
      // Main log file
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxFiles: this.logRetentionDays,
          maxsize: 5242880, // 5MB
          tailable: true
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxFiles: this.logRetentionDays,
          maxsize: 5242880,
          tailable: true
        })
      );

      // If remote logging is configured
      if (monitoringConfig.logging?.remoteEndpoint) {
        transports.push(
          new winston.transports.Http({
            host: monitoringConfig.logging.remoteEndpoint,
            ssl: true,
            batch: true,
            batchCount: 100,
            batchInterval: 5000
          })
        );
      }
    }

    return transports;
  }

  public log(entry: LogEntry): void {
    this.logger.log({
      level: entry.level,
      message: entry.message,
      ...entry.context && { context: entry.context },
      ...entry.error && { error: this.formatError(entry.error) },
      ...entry.metadata && { metadata: entry.metadata }
    });
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log({
      level: 'error',
      message,
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private formatError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any).code && { code: (error as any).code },
      ...(error as any).statusCode && { statusCode: (error as any).statusCode }
    };
  }

  public async flush(): Promise<void> {
    // Wait for all transports to flush their logs
    await Promise.all(
      this.logger.transports.map((transport) => {
        return new Promise<void>((resolve) => {
          if ('flush' in transport) {
            (transport as any).flush(() => resolve());
          } else {
            resolve();
          }
        });
      })
    );
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();
