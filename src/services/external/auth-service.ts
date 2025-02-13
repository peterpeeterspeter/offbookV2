import { ServiceError } from '../service-integration';

interface User {
  id: string;
  username: string;
  email: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RefreshCredentials {
  token: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn?: number;
}

type AuthRequest = {
  type: 'login';
  credentials: LoginCredentials;
} | {
  type: 'logout';
} | {
  type: 'refresh';
  credentials: RefreshCredentials;
};

interface ExternalService {
  initialize(): Promise<void>;
  metrics: {
    latency: number;
    status: 'connected' | 'disconnected' | 'error';
  };
}

export class AuthService implements ExternalService {
  private readonly TOKEN_REFRESH_BUFFER = 300000; // 5 minutes in milliseconds
  private _currentUser?: User;
  private _endpoint: string;
  private _metrics = {
    latency: 0,
    status: 'disconnected' as 'connected' | 'disconnected' | 'error'
  };

  constructor(config: { endpoint: string }) {
    this._endpoint = config.endpoint;
  }

  public get metrics() {
    return this._metrics;
  }

  public getCurrentUser(): User | undefined {
    return this._currentUser;
  }

  public async initialize(): Promise<void> {
    if (!this._endpoint) {
      throw new ServiceError('CONFIG_ERROR', 'Auth service requires an endpoint');
    }
    this._metrics.status = 'connected';
  }

  public async authenticate(request: AuthRequest): Promise<AuthResponse> {
    const startTime = Date.now();
    try {
      if (this._metrics.status !== 'connected') {
        throw new ServiceError('CONNECTION_ERROR', 'Auth service is not connected');
      }

      switch (request.type) {
        case 'login':
          return await this.handleLogin(request.credentials);
        case 'logout':
          return await this.handleLogout();
        case 'refresh':
          return await this.handleRefresh(request.credentials);
        default:
          throw new ServiceError('INVALID_REQUEST', 'Invalid authentication request type');
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError('AUTH_FAILED', 'Authentication failed');
    } finally {
      this._metrics.latency = Date.now() - startTime;
    }
  }

  private async handleLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate login response
    if (credentials.username === 'testuser' && credentials.password === 'testpassword') {
      const token = 'test-token-' + Date.now();
      const refreshToken = 'test-refresh-token-' + Date.now();
      const expiresIn = 30; // 30 seconds for testing

      this._currentUser = {
        id: '1',
        username: credentials.username,
        email: 'test@example.com'
      };

      return {
        token,
        refreshToken,
        user: this._currentUser,
        expiresIn
      };
    }

    throw new ServiceError('INVALID_CREDENTIALS', 'Invalid username or password');
  }

  private async handleLogout(): Promise<AuthResponse> {
    // Clear current user
    this._currentUser = undefined;

    // Return empty tokens to clear cookies
    return {
      token: '',
      refreshToken: '',
      user: {
        id: '',
        username: '',
        email: ''
      }
    };
  }

  private async handleRefresh(credentials: RefreshCredentials): Promise<AuthResponse> {
    if (!credentials.token) {
      throw new ServiceError('INVALID_TOKEN', 'Refresh token is required');
    }

    // For testing, accept both auth token and refresh token formats
    const isValidToken = credentials.token.startsWith('test-token-') ||
                        credentials.token.startsWith('test-refresh-token-');

    if (!isValidToken) {
      throw new ServiceError('INVALID_TOKEN', 'Invalid refresh token');
    }

    // If we don't have a current user, try to restore it from the token
    if (!this._currentUser) {
      this._currentUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com'
      };
    }

    // Generate new tokens
    const token = 'test-token-' + Date.now();
    const refreshToken = 'test-refresh-token-' + Date.now();
    const expiresIn = 30; // 30 seconds for testing

    return {
      token,
      refreshToken,
      user: this._currentUser,
      expiresIn
    };
  }
}
