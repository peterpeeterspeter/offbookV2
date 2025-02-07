import { ExternalService, ExternalServiceConfig, ExternalServiceMetrics, StorageRequest, StorageResponse } from './types';
export declare class StorageService implements ExternalService {
    [key: string]: unknown;
    private connected;
    private metrics;
    private config;
    private cache;
    constructor(config: ExternalServiceConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getMetrics(): ExternalServiceMetrics;
    upload(request: StorageRequest): Promise<StorageResponse>;
    download(request: StorageRequest): Promise<StorageResponse>;
    delete(request: StorageRequest): Promise<void>;
    dispose(): Promise<void>;
}
