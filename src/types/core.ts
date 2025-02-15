// Core service interfaces
export interface Service {
  setup(): Promise<void>;
  cleanup(): Promise<void>;
}

// Error handling
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

// State management
export interface ServiceState<T> {
  isInitialized: boolean;
  isLoading: boolean;
  error?: Error;
  data?: T;
}

// Configuration
export interface ServiceConfig {
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
  metrics: {
    enabled: boolean;
    sampleRate: number;
    flushInterval: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

// Event system
export interface ServiceEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source: string;
}

export interface EventHandler<T = unknown> {
  (event: ServiceEvent<T>): Promise<void> | void;
}

export interface EventEmitter {
  emit<T>(event: ServiceEvent<T>): void;
  on<T>(eventType: string, handler: EventHandler<T>): void;
  off<T>(eventType: string, handler: EventHandler<T>): void;
}

// Resource management
export interface ResourceManager {
  acquire(id: string): Promise<void>;
  release(id: string): Promise<void>;
  isAcquired(id: string): boolean;
}

// Metrics
export interface MetricsCollector {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, value: number, tags?: Record<string, string>): void;
  flush(): Promise<void>;
}

// Cache
export interface Cache<K, V> {
  get(key: K): Promise<V | undefined>;
  set(key: K, value: V, ttl?: number): Promise<void>;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;
}

// Batch processing
export interface BatchProcessor<T, R> {
  process(items: T[]): Promise<R[]>;
  add(item: T, priority?: number): Promise<void>;
  clear(): Promise<void>;
}

// Health checking
export interface HealthCheck {
  name: string;
  check(): Promise<{
    status: 'healthy' | 'unhealthy';
    details?: Record<string, unknown>;
  }>;
}

// Lifecycle management
export interface ServiceLifecycle {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
}

// Dependency injection
export interface ServiceContainer {
  register<T>(token: symbol, implementation: T): void;
  resolve<T>(token: symbol): T;
}

export interface BaseService<T> {
  getState(): ServiceState<T>;
  addStateListener(listener: (state: ServiceState<T>) => void): () => void;
  removeStateListener(listener: (state: ServiceState<T>) => void): void;
}

export interface ServiceContext {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ErrorDetails[];
}
