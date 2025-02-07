import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TTSService } from '../external/tts-service';
import { ServiceError } from '../service-integration';
import { ExternalServiceConfig, TTSRequest } from '../external/types';

describe('TTSService', () => {
  let service: TTSService;
  let config: ExternalServiceConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      endpoint: 'https://tts.api.test'
    };
    service = new TTSService(config);
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
    });

    it('should throw error when initializing without API key', async () => {
      service = new TTSService({});
      await expect(service.initialize()).rejects.toThrow(ServiceError);
      expect(service.isConnected()).toBe(false);
    });

    it('should disconnect successfully', async () => {
      await service.initialize();
      await service.disconnect();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Speech Synthesis', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should synthesize speech successfully', async () => {
      const request: TTSRequest = {
        text: 'Hello, world!',
        voice: 'en-US-Standard-A',
        language: 'en-US'
      };

      const response = await service.synthesize(request);
      expect(response.audioData).toBeInstanceOf(ArrayBuffer);
      expect(response.duration).toBeGreaterThan(0);
      expect(response.format).toBe('audio/wav');
    });

    it('should throw error when not connected', async () => {
      await service.disconnect();
      const request: TTSRequest = { text: 'Hello' };
      await expect(service.synthesize(request)).rejects.toThrow(ServiceError);
    });

    it('should update metrics after synthesis', async () => {
      const request: TTSRequest = { text: 'Hello' };
      await service.synthesize(request);

      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
      expect(metrics.lastRequest).toBeInstanceOf(Date);
    });

    it('should update error metrics on failure', async () => {
      // Mock a failure by disconnecting the service
      await service.disconnect();
      const request: TTSRequest = { text: 'Hello' };

      try {
        await service.synthesize(request);
      } catch (error) {
        // Expected error
      }

      const metrics = service.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should accept valid configuration options', () => {
      const fullConfig: ExternalServiceConfig = {
        apiKey: 'test-key',
        endpoint: 'https://tts.api.test',
        region: 'us-east-1',
        options: {
          maxConcurrentRequests: 5,
          timeout: 10000
        }
      };

      service = new TTSService(fullConfig);
      expect(service).toBeInstanceOf(TTSService);
    });

    it('should handle missing optional configuration', () => {
      const minimalConfig: ExternalServiceConfig = {
        apiKey: 'test-key'
      };

      service = new TTSService(minimalConfig);
      expect(service).toBeInstanceOf(TTSService);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network errors', async () => {
      // Simulate a network error
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const request: TTSRequest = { text: 'Hello' };
      await expect(service.synthesize(request)).rejects.toThrow(ServiceError);
    });

    it('should handle invalid requests', async () => {
      const invalidRequest = { text: '' } as TTSRequest;
      await expect(service.synthesize(invalidRequest)).rejects.toThrow(ServiceError);
    });

    it('should handle service errors', async () => {
      // Simulate a service error
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const request: TTSRequest = { text: 'Hello' };
      await expect(service.synthesize(request)).rejects.toThrow(ServiceError);
    });
  });
});
