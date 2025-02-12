/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TTSServiceImpl } from '../external/tts-service';
import { ServiceError } from '../service-integration';
import { ExternalServiceConfig, TTSRequest } from '../external/types';
import type { Service } from '@/types/core';

class MockConfigService implements Service {
  settings = {
    apiKey: 'test-api-key'
  };

  async setup(): Promise<void> {}
  async cleanup(): Promise<void> {}
}

describe('TTSService', () => {
  let service: TTSServiceImpl;
  const dependencies = {
    config: new MockConfigService()
  };

  beforeEach(() => {
    service = new TTSServiceImpl();
    // Mock fetch API
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      })
    );
  });

  afterEach(async () => {
    await service.dispose();
    vi.restoreAllMocks();
  });

  describe('Lifecycle', () => {
    it('should initialize correctly', async () => {
      await service.initialize(dependencies);
      expect(service['isConnected']).toBe(true);
    });

    it('should synthesize text correctly', async () => {
      const request = {
        text: 'Hello world'
      };

      await service.initialize(dependencies);
      const response = await service.synthesize(request.text);
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(ArrayBuffer);
    });

    it('should throw error when initializing without API key', async () => {
      await expect(service.initialize({})).rejects.toThrow(ServiceError);
      expect(service['isConnected']).toBe(false);
    });

    it('should disconnect successfully', async () => {
      await service.initialize(dependencies);
      await service.dispose();
      expect(service['isConnected']).toBe(false);
    });
  });

  describe('Speech Synthesis', () => {
    beforeEach(async () => {
      await service.initialize(dependencies);
    });

    it('should synthesize speech successfully', async () => {
      const text = 'Hello, world!';
      const response = await service.synthesize(text);
      expect(response).toBeInstanceOf(ArrayBuffer);
    });

    it('should throw error when not connected', async () => {
      await service.dispose();
      const text = 'Hello';
      await expect(service.synthesize(text)).rejects.toThrow(ServiceError);
    });

    it('should update metrics after synthesis', async () => {
      const text = 'Hello';
      await service.synthesize(text);

      const metrics = service.getMetrics();
      expect(metrics.requestId).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.characters).toBe(5);
    });

    it('should update metrics on failure', async () => {
      await service.dispose();
      const text = 'Hello';

      try {
        await service.synthesize(text);
      } catch (error) {
        // Expected error
      }

      const metrics = service.getMetrics();
      expect(metrics.requestId).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.characters).toBe(5);
    });
  });

  describe('Configuration', () => {
    it('should accept valid configuration options', async () => {
      await service.initialize(dependencies);
      expect(service['apiKey']).toBe('test-api-key');
    });

    it('should handle missing optional configuration', async () => {
      await expect(service.initialize({})).rejects.toThrow(ServiceError);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize(dependencies);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await expect(service.synthesize('test')).rejects.toThrow(ServiceError);
    });

    it('should handle invalid requests', async () => {
      await expect(service.synthesize('')).rejects.toThrow(ServiceError);
    });

    it('should handle service errors', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );
      await expect(service.synthesize('test')).rejects.toThrow(ServiceError);
    });
  });
});
