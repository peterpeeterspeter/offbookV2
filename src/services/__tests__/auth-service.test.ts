import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../external/auth-service';
import { ServiceError } from '../service-integration';
import { ExternalServiceConfig, AuthRequest } from '../external/types';

describe('AuthService', () => {
  let service: AuthService;
  let config: ExternalServiceConfig;

  beforeEach(() => {
    config = {
      endpoint: 'https://auth.api.test',
      apiKey: 'test-api-key'
    };
    service = new AuthService(config);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await service.dispose();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
    });

    it('should throw error when initializing without endpoint', async () => {
      service = new AuthService({});
      await expect(service.initialize()).rejects.toThrow(ServiceError);
      expect(service.isConnected()).toBe(false);
    });

    it('should disconnect and clear user state', async () => {
      await service.initialize();
      await service.authenticate({
        type: 'login',
        credentials: {
          username: 'test',
          password: 'password'
        }
      });

      await service.disconnect();
      expect(service.isConnected()).toBe(false);
      expect(service.getCurrentUser()).toBeUndefined();
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    describe('Login', () => {
      it('should login successfully with valid credentials', async () => {
        const request: AuthRequest = {
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        };

        const response = await service.authenticate(request);
        expect(response.token).toBeDefined();
        expect(response.refreshToken).toBeDefined();
        expect(response.user).toBeDefined();
        expect(service.getCurrentUser()).toEqual(response.user);
      });

      it('should throw error with invalid credentials', async () => {
        const request: AuthRequest = {
          type: 'login',
          credentials: {
            username: '',
            password: ''
          }
        };

        await expect(service.authenticate(request)).rejects.toThrow(ServiceError);
      });

      it('should setup token refresh timer', async () => {
        const request: AuthRequest = {
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        };

        await service.authenticate(request);

        // Fast forward to just before token expiry
        vi.advanceTimersByTime(3000000); // 50 minutes

        // Should still have a valid user
        expect(service.getCurrentUser()).toBeDefined();
      });
    });

    describe('Logout', () => {
      it('should logout successfully', async () => {
        // Login first
        await service.authenticate({
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        });

        // Then logout
        await service.authenticate({ type: 'logout' });
        expect(service.getCurrentUser()).toBeUndefined();
      });

      it('should clear refresh timer on logout', async () => {
        // Login first
        await service.authenticate({
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        });

        // Logout
        await service.authenticate({ type: 'logout' });

        // Fast forward past refresh time
        vi.advanceTimersByTime(3600000);
        await vi.runAllTimersAsync();

        // No refresh should have occurred
        expect(service.getCurrentUser()).toBeUndefined();
      });
    });

    describe('Token Refresh', () => {
      it('should refresh token before expiry', async () => {
        // Login first
        const loginResponse = await service.authenticate({
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        });

        const originalToken = loginResponse.token;

        // Fast forward to just before token refresh
        vi.advanceTimersByTime(3300000); // 55 minutes
        await vi.runAllTimersAsync();

        // Token should have been refreshed
        const currentUser = service.getCurrentUser();
        expect(currentUser).toBeDefined();

        // Request new token to verify it's different
        const refreshRequest: AuthRequest = {
          type: 'refresh',
          credentials: {
            token: loginResponse.refreshToken
          }
        };
        const refreshResponse = await service.authenticate(refreshRequest);
        expect(refreshResponse.token).not.toBe(originalToken);
      });

      it('should handle failed token refresh', async () => {
        // Login first
        await service.authenticate({
          type: 'login',
          credentials: {
            username: 'test',
            password: 'password'
          }
        });

        // Mock refresh to fail
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Refresh failed'));

        // Fast forward to refresh time
        vi.advanceTimersByTime(3300000); // 55 minutes
        await vi.runAllTimersAsync();

        // User should be logged out
        expect(service.getCurrentUser()).toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const request: AuthRequest = {
        type: 'login',
        credentials: {
          username: 'test',
          password: 'password'
        }
      };

      await expect(service.authenticate(request)).rejects.toThrow(ServiceError);
      const metrics = service.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should handle invalid request type', async () => {
      const request = {
        type: 'invalid'
      } as unknown as AuthRequest;

      await expect(service.authenticate(request)).rejects.toThrow(ServiceError);
    });

    it('should handle service errors', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const request: AuthRequest = {
        type: 'login',
        credentials: {
          username: 'test',
          password: 'wrong'
        }
      };

      await expect(service.authenticate(request)).rejects.toThrow(ServiceError);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track successful operations', async () => {
      await service.authenticate({
        type: 'login',
        credentials: {
          username: 'test',
          password: 'password'
        }
      });

      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
      expect(metrics.lastRequest).toBeInstanceOf(Date);
    });

    it('should track failed operations', async () => {
      try {
        await service.authenticate({
          type: 'login',
          credentials: {
            username: '',
            password: ''
          }
        });
      } catch (error) {
        // Expected error
      }

      const metrics = service.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });
});
