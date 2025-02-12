import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceIntegration, ServiceEvent, ServiceError } from '../service-integration';
import { AudioProcessingService, StreamStatus } from '../audio-processing';
import { SceneManagementService } from '../scene-management';
import { Service, ServiceHealth, ServiceVersion, ServiceConfig } from '../service-integration';

interface EventData {
  sceneId: string;
  audioData?: ArrayBuffer;
  useSharedBuffer?: boolean;
  optimize?: boolean;
}

describe('Service Integration', () => {
  let integration: ServiceIntegration;
  let audioService: AudioProcessingService;
  let sceneService: SceneManagementService;

  beforeEach(() => {
    audioService = new AudioProcessingService();
    sceneService = new SceneManagementService();
    integration = new ServiceIntegration();

    // Register services
    integration.registerService('audio', audioService as unknown as { initialize?: () => Promise<void> });
    integration.registerService('scene', sceneService as unknown as { initialize?: () => Promise<void> });
  });

  describe('Service Communication', () => {
    it('should handle inter-service events', async () => {
      const eventSpy = vi.fn();
      integration.on(ServiceEvent.AudioProcessed, eventSpy);

      await integration.dispatch(ServiceEvent.ProcessAudio, {
        sceneId: 'scene1',
        audioData: new ArrayBuffer(1024)
      } as EventData);

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneId: 'scene1',
          status: 'completed'
        })
      );
    });

    it('should maintain event order', async () => {
      const events: string[] = [];
      const pushEvent = (name: string) => {
        events.push(name);
        return Promise.resolve();
      };

      integration.on(ServiceEvent.AudioProcessed, () => pushEvent('audio'));
      integration.on(ServiceEvent.SceneUpdated, () => pushEvent('scene'));

      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData);
      await integration.dispatch(ServiceEvent.UpdateScene, { sceneId: 'scene1' } as EventData);

      expect(events).toEqual(['audio', 'scene']);
    });

    it('should handle event cancellation', async () => {
      const eventSpy = vi.fn();
      integration.on(ServiceEvent.AudioProcessed, eventSpy);

      integration.on(ServiceEvent.ProcessAudio, (data: unknown, cancel?: () => void) => {
        const eventData = data as EventData;
        if (eventData.sceneId === 'invalid' && cancel) {
          cancel();
        }
      });

      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'invalid' } as EventData);
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    it('should synchronize state between services', async () => {
      await integration.dispatch(ServiceEvent.ProcessAudio, {
        sceneId: 'scene1',
        audioData: new ArrayBuffer(1024)
      } as EventData);

      const audioState = integration.getServiceState('audio');
      const sceneState = integration.getServiceState('scene');

      expect(audioState.processedScenes).toContain('scene1');
      expect(sceneState.currentScene).toBe('scene1');
    });

    it('should handle state conflicts', async () => {
      const conflictSpy = vi.fn();
      integration.onStateConflict(conflictSpy);

      // Simulate concurrent updates
      await Promise.all([
        integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData),
        integration.dispatch(ServiceEvent.UpdateScene, { sceneId: 'scene2' } as EventData)
      ]);

      expect(conflictSpy).toHaveBeenCalled();
      expect(integration.getServiceState('scene').currentScene).toBe('scene1');
    });

    it('should maintain state history', async () => {
      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData);
      await integration.dispatch(ServiceEvent.UpdateScene, { sceneId: 'scene2' } as EventData);

      const history = integration.getStateHistory();
      expect(history).toHaveLength(2);
      expect(history[0].scene.currentScene).toBe('scene1');
      expect(history[1].scene.currentScene).toBe('scene2');
    });
  });

  describe('Error Propagation', () => {
    it('should handle service errors', async () => {
      const errorSpy = vi.fn();
      integration.onError(errorSpy);

      const error = new Error('Processing failed');
      vi.spyOn(audioService, 'processStream').mockRejectedValue(error);

      await integration.dispatch(ServiceEvent.ProcessAudio, {
        sceneId: 'scene1',
        audioData: new ArrayBuffer(1024)
      } as EventData);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'audio',
          error
        })
      );
    });

    it('should support error recovery', async () => {
      const recoverySpy = vi.fn();
      integration.onRecovery(recoverySpy);

      integration.setErrorHandler('audio', async (error: ServiceError) => {
        if (error.code === 'PROCESSING_ERROR') {
          return { retry: true };
        }
        return { retry: false };
      });

      const error = new ServiceError('PROCESSING_ERROR', 'Processing failed');
      vi.spyOn(audioService, 'processStream')
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(StreamStatus.Completed);

      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData);
      expect(recoverySpy).toHaveBeenCalled();
    });

    it('should handle cascading errors', async () => {
      const errorSpy = vi.fn();
      integration.onError(errorSpy);

      const error = new Error('Scene update failed');
      vi.spyOn(sceneService, 'updateProgress').mockRejectedValue(error);

      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData);
      expect(errorSpy).toHaveBeenCalledTimes(2); // Audio error + Scene error
    });
  });

  describe('Resource Sharing', () => {
    it('should manage shared resources', async () => {
      const resource = new SharedArrayBuffer(1024);
      integration.registerSharedResource('buffer', resource);

      await integration.dispatch(ServiceEvent.ProcessAudio, {
        sceneId: 'scene1',
        useSharedBuffer: true
      } as EventData);

      expect(integration.getResourceUsage('buffer')).toBeGreaterThan(0);
    });

    it('should handle resource contention', async () => {
      const contentionSpy = vi.fn();
      integration.onResourceContention(contentionSpy);

      // Simulate concurrent resource access
      await Promise.all([
        integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData),
        integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene2' } as EventData)
      ]);

      expect(contentionSpy).toHaveBeenCalled();
    });

    it('should cleanup resources', async () => {
      const resource = new SharedArrayBuffer(1024);
      const id = integration.registerSharedResource('buffer', resource);

      await integration.dispatch(ServiceEvent.ProcessAudio, { sceneId: 'scene1' } as EventData);
      await integration.releaseResource(id);

      expect(integration.getResourceUsage('buffer')).toBe(0);
    });

    it('should optimize resource allocation', async () => {
      const metrics = await integration.dispatch(ServiceEvent.ProcessAudio, {
        sceneId: 'scene1',
        optimize: true
      } as EventData);

      expect(metrics.resourceEfficiency).toBeGreaterThan(0.8);
    });
  });

  describe('Service Lifecycle', () => {
    it('should handle service initialization', async () => {
      const newService = { initialize: vi.fn() };
      await integration.registerService('new', newService);
      expect(newService.initialize).toHaveBeenCalled();
    });

    it('should manage service dependencies', async () => {
      const dependentService = {
        dependencies: ['audio', 'scene'],
        initialize: vi.fn()
      };

      await integration.registerService('dependent', dependentService);
      expect(dependentService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.any(AudioProcessingService),
          scene: expect.any(SceneManagementService)
        })
      );
    });

    it('should handle service disposal', async () => {
      const disposeSpy = vi.fn();
      const service = {
        initialize: vi.fn(),
        dispose: disposeSpy
      };

      await integration.registerService('temp', service);
      await integration.removeService('temp');

      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});

describe('Health Monitoring', () => {
  let integration: ServiceIntegration;
  let healthyService: Service;
  let degradedService: Service;

  beforeEach(() => {
    healthyService = {
      health: vi.fn().mockResolvedValue({
        status: 'healthy',
        lastCheck: Date.now(),
        metrics: {
          responseTime: 100,
          errorRate: 0,
          uptime: 3600
        }
      } as ServiceHealth)
    };

    degradedService = {
      health: vi.fn().mockResolvedValue({
        status: 'degraded',
        lastCheck: Date.now(),
        metrics: {
          responseTime: 500,
          errorRate: 0.1,
          uptime: 3600
        },
        issues: ['High response time']
      } as ServiceHealth)
    };

    integration = new ServiceIntegration({
      healthCheckInterval: 1000
    });
  });

  it('should monitor service health', async () => {
    await integration.registerService('healthy', healthyService);
    const health = await integration.getServiceHealth('healthy');
    expect(health.status).toBe('healthy');
    expect(health.metrics.responseTime).toBe(100);
  });

  it('should detect degraded services', async () => {
    const degradedSpy = vi.fn();
    integration.on(ServiceEvent.ServiceDegraded, degradedSpy);

    await integration.registerService('degraded', degradedService);
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for health check

    expect(degradedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'degraded',
        health: expect.objectContaining({
          status: 'degraded',
          issues: ['High response time']
        })
      })
    );
  });

  it('should handle health check errors', async () => {
    const errorService = {
      health: vi.fn().mockRejectedValue(new Error('Health check failed'))
    };

    const errorSpy = vi.fn();
    integration.onError(errorSpy);

    await integration.registerService('error', errorService);
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'error',
        error: expect.any(ServiceError)
      })
    );
  });
});

describe('Version Management', () => {
  let integration: ServiceIntegration;

  beforeEach(() => {
    integration = new ServiceIntegration();
  });

  it('should register service with version', async () => {
    const version: ServiceVersion = {
      major: 1,
      minor: 0,
      patch: 0,
      features: ['feature1'],
      compatibleWith: ['1.0']
    };

    await integration.registerService('test', { initialize: vi.fn() }, version);
    const services = await integration.discoverServices();
    expect(services[0].version).toEqual(version);
  });

  it('should check version compatibility', async () => {
    const v1: ServiceVersion = {
      major: 1,
      minor: 0,
      patch: 0,
      features: ['base'],
      compatibleWith: ['1.0']
    };

    const v2: ServiceVersion = {
      major: 2,
      minor: 0,
      patch: 0,
      features: ['base', 'new'],
      compatibleWith: ['2.0']
    };

    await integration.registerService('base', { initialize: vi.fn() }, v1);
    await expect(
      integration.registerService('dependent', {
        dependencies: ['base'],
        initialize: vi.fn()
      }, v2)
    ).rejects.toThrow('VERSION_INCOMPATIBLE');
  });
});

describe('Configuration Management', () => {
  let integration: ServiceIntegration;
  let configurableService: Service;

  beforeEach(() => {
    configurableService = {
      configure: vi.fn(),
      initialize: vi.fn()
    };

    integration = new ServiceIntegration();
  });

  it('should configure service', async () => {
    await integration.registerService('config', configurableService);

    const config: Partial<ServiceConfig> = {
      settings: {
        timeout: 1000,
        retries: 3
      }
    };

    await integration.configureService('config', config);
    expect(configurableService.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: config.settings
      })
    );
  });

  it('should merge configurations', async () => {
    await integration.registerService('config', configurableService);

    await integration.configureService('config', {
      settings: { timeout: 1000 }
    });

    await integration.configureService('config', {
      settings: { retries: 3 }
    });

    expect(configurableService.configure).toHaveBeenLastCalledWith(
      expect.objectContaining({
        settings: {
          timeout: 1000,
          retries: 3
        }
      })
    );
  });

  it('should handle configuration errors', async () => {
    const errorService = {
      configure: vi.fn().mockRejectedValue(new Error('Invalid config')),
      initialize: vi.fn()
    };

    await integration.registerService('error', errorService);
    await expect(
      integration.configureService('error', {
        settings: { invalid: true }
      })
    ).rejects.toThrow();
  });
});

describe('Service Discovery', () => {
  let integration: ServiceIntegration;

  beforeEach(() => {
    integration = new ServiceIntegration({
      enableDiscovery: true
    });
  });

  it('should discover services by capability', async () => {
    const service1 = {
      discover: vi.fn().mockResolvedValue({
        id: '1',
        name: 'service1',
        capabilities: ['feature1'],
        version: { major: 1, minor: 0, patch: 0, features: [], compatibleWith: [] }
      })
    };

    const service2 = {
      discover: vi.fn().mockResolvedValue({
        id: '2',
        name: 'service2',
        capabilities: ['feature2'],
        version: { major: 1, minor: 0, patch: 0, features: [], compatibleWith: [] }
      })
    };

    await integration.registerService('service1', service1);
    await integration.registerService('service2', service2);

    const services = await integration.discoverServices('feature1');
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('service1');
  });

  it('should emit discovery events', async () => {
    const discoverySpy = vi.fn();
    integration.on(ServiceEvent.ServiceDiscovered, discoverySpy);

    const service = {
      discover: vi.fn().mockResolvedValue({
        id: '1',
        name: 'service',
        capabilities: ['feature'],
        version: { major: 1, minor: 0, patch: 0, features: [], compatibleWith: [] }
      })
    };

    await integration.registerService('service', service);
    expect(discoverySpy).toHaveBeenCalled();
  });

  it('should handle discovery errors', async () => {
    const errorService = {
      discover: vi.fn().mockRejectedValue(new Error('Discovery failed'))
    };

    const errorSpy = vi.fn();
    integration.onError(errorSpy);

    await integration.registerService('error', errorService);
    await integration.discoverServices();

    expect(errorSpy).toHaveBeenCalled();
  });
});
