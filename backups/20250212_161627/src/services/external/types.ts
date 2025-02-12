import { Service } from '../service-integration';

export interface ExternalServiceConfig {
  apiKey?: string;
  endpoint?: string;
  region?: string;
  options?: Record<string, unknown>;
}

export interface ExternalServiceMetrics {
  requestCount: number;
  errorCount: number;
  latency: number;
  lastRequest: Date;
}

export interface ExternalService extends Service {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getMetrics(): ExternalServiceMetrics;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResponse {
  audioData: ArrayBuffer;
  duration: number;
  format: string;
}

export interface StorageRequest {
  key: string;
  data?: ArrayBuffer | string;
  metadata?: Record<string, string>;
}

export interface StorageResponse {
  url?: string;
  metadata?: Record<string, string>;
  size?: number;
  lastModified?: Date;
}

export interface AnalyticsEvent {
  name: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface AuthRequest {
  type: 'login' | 'logout' | 'refresh';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
}

export interface TTSMetrics {
  requestCount: number;
  errorCount: number;
  averageLatency: number;
  totalLatency: number;
}

export interface TTSServiceType extends Service {
  initialize(dependencies: Record<string, Service>): Promise<void>;
  synthesize(text: string): Promise<TTSResponse>;
  getMetrics(): TTSMetrics;
  dispose(): Promise<void>;
}
