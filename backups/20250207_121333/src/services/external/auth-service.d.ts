import { ExternalService, ExternalServiceConfig, ExternalServiceMetrics, AuthRequest, AuthResponse } from './types';
export declare class AuthService implements ExternalService {
    [key: string]: unknown;
    private connected;
    private metrics;
    private config;
    private currentUser?;
    private refreshTimer?;
    private readonly TOKEN_REFRESH_BUFFER;
    constructor(config: ExternalServiceConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getMetrics(): ExternalServiceMetrics;
    authenticate(request: AuthRequest): Promise<AuthResponse>;
    private handleLogin;
    private handleLogout;
    private handleRefresh;
    private setupTokenRefresh;
    getCurrentUser(): AuthResponse['user'] | undefined;
    dispose(): Promise<void>;
}
