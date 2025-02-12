import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../external/storage-service';
import { ServiceError } from '../service-integration';
import { ExternalServiceConfig, StorageRequest } from '../external/types';

describe('StorageService', () => {
  let service: StorageService;
  let config: ExternalServiceConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      endpoint: 'https://storage.api.test'
    };
    service = new StorageService(config);
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
    });

    it('should throw error when initializing without required config', async () => {
      service = new StorageService({});
      await expect(service.initialize()).rejects.toThrow(ServiceError);
      expect(service.isConnected()).toBe(false);
    });

    it('should disconnect and clear cache', async () => {
      await service.initialize();
      const request: StorageRequest = {
        key: 'test-key',
        data: 'test-data'
      };
      await service.upload(request);

      await service.disconnect();
      expect(service.isConnected()).toBe(false);

      // Verify cache is cleared by attempting to download
      await service.initialize();
      const cached = await service.download({ key: 'test-key' });
      expect(cached.url).toBe('https://storage.api.test/test-key');
      expect(cached.size).toBe(0); // Default response, not cached
    });
  });

  describe('Storage Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    describe('Upload', () => {
      it('should upload data successfully', async () => {
        const request: StorageRequest = {
          key: 'test-file',
          data: 'test-content',
          metadata: { type: 'text' }
        };

        const response = await service.upload(request);
        expect(response.url).toBe('https://storage.api.test/test-file');
        expect(response.metadata).toEqual({ type: 'text' });
        expect(response.size).toBe(12); // length of 'test-content'
        expect(response.lastModified).toBeInstanceOf(Date);
      });

      it('should handle ArrayBuffer data', async () => {
        const buffer = new ArrayBuffer(10);
        const request: StorageRequest = {
          key: 'binary-file',
          data: buffer
        };

        const response = await service.upload(request);
        expect(response.size).toBe(10);
      });

      it('should throw error when uploading without data', async () => {
        const request: StorageRequest = { key: 'empty-file' };
        await expect(service.upload(request)).rejects.toThrow(ServiceError);
      });
    });

    describe('Download', () => {
      it('should return cached response if available', async () => {
        const uploadRequest: StorageRequest = {
          key: 'cached-file',
          data: 'cached-content',
          metadata: { cached: 'true' }
        };
        await service.upload(uploadRequest);

        const response = await service.download({ key: 'cached-file' });
        expect(response.metadata).toEqual({ cached: 'true' });
      });

      it('should fetch from storage if not cached', async () => {
        const response = await service.download({ key: 'uncached-file' });
        expect(response.url).toBe('https://storage.api.test/uncached-file');
      });
    });

    describe('Delete', () => {
      it('should delete file and remove from cache', async () => {
        // Upload first
        await service.upload({
          key: 'to-delete',
          data: 'delete-me'
        });

        // Delete
        await service.delete({ key: 'to-delete' });

        // Verify deletion by downloading
        const response = await service.download({ key: 'to-delete' });
        expect(response.size).toBe(0); // Default response, not cached
      });
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track successful operations', async () => {
      await service.upload({
        key: 'metrics-test',
        data: 'test'
      });

      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
      expect(metrics.lastRequest).toBeInstanceOf(Date);
    });

    it('should track failed operations', async () => {
      try {
        await service.upload({ key: 'error-test' }); // Missing data
      } catch (error) {
        // Expected error
      }

      const metrics = service.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const request: StorageRequest = {
        key: 'network-test',
        data: 'test'
      };
      await expect(service.upload(request)).rejects.toThrow(ServiceError);
    });

    it('should handle service errors', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      const request: StorageRequest = {
        key: 'service-error',
        data: 'test'
      };
      await expect(service.upload(request)).rejects.toThrow(ServiceError);
    });

    it('should handle invalid keys', async () => {
      const request: StorageRequest = {
        key: '',
        data: 'test'
      };
      await expect(service.upload(request)).rejects.toThrow(ServiceError);
    });
  });
});
