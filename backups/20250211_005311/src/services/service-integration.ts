export enum ServiceEvent {
  // Audio events
  ProcessAudio = 'process_audio',
  AudioProcessed = 'audio_processed',
  AudioError = 'audio_error',

  // Scene events
  UpdateScene = 'update_scene',
  SceneUpdated = 'scene_updated',
  SceneError = 'scene_error',

  // Resource events
  ResourceAllocated = 'resource_allocated',
  ResourceReleased = 'resource_released',
  ResourceError = 'resource_error',

  // Health events
  HealthCheck = 'health_check',
  HealthStatus = 'health_status',
  ServiceDegraded = 'service_degraded',

  // Configuration events
  ConfigUpdate = 'config_update',
  ConfigChanged = 'config_changed',
  ConfigError = 'config_error',

  // Discovery events
  ServiceDiscovered = 'service_discovered',
  ServiceLost = 'service_lost',
  ServiceChanged = 'service_changed'
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface ServiceState {
  [key: string]: unknown;
}

export interface ServiceMetrics {
  resourceEfficiency: number;
  processingTime: number;
  memoryUsage: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  metrics: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  issues?: string[];
}

export interface ServiceVersion {
  major: number;
  minor: number;
  patch: number;
  features: string[];
  compatibleWith: string[];
}

export interface ServiceConfig {
  settings: Record<string, unknown>;
  defaults: Record<string, unknown>;
  overrides: Record<string, unknown>;
  schema?: Record<string, unknown>;
}

export interface ServiceDiscoveryInfo {
  id: string;
  name: string;
  version: ServiceVersion;
  capabilities: string[];
  endpoints?: string[];
}

export interface Service {
  initialize?: (dependencies: Record<string, Service>) => Promise<void>;
  dispose?: () => Promise<void>;
  dependencies?: string[];
  version?: ServiceVersion;
  health?: () => Promise<ServiceHealth>;
  configure?: (config: ServiceConfig) => Promise<void>;
  discover?: () => Promise<ServiceDiscoveryInfo>;
  [key: string]: unknown;
}

type EventCallback = (data: unknown, cancel?: () => void) => void | Promise<void>;
type ErrorHandler = (error: ServiceError) => Promise<{ retry: boolean }>;

interface SharedResource {
  id: string;
  type: string;
  data: SharedArrayBuffer;
  usage: number;
  locks: Set<string>;
}

export class ServiceIntegration {
  private services = new Map<string, Service>();
  private eventHandlers = new Map<ServiceEvent, Set<EventCallback>>();
  private errorHandlers = new Map<string, ErrorHandler>();
  private resources = new Map<string, SharedResource>();
  private state = new Map<string, ServiceState>();
  private stateHistory: Array<Record<string, ServiceState>> = [];
  private metrics: ServiceMetrics = {
    resourceEfficiency: 1,
    processingTime: 0,
    memoryUsage: 0
  };

  private listeners = {
    error: new Set<(error: { service: string; error: Error }) => void>(),
    recovery: new Set<(details: { service: string; error: ServiceError }) => void>(),
    stateConflict: new Set<(details: { services: string[]; states: ServiceState[] }) => void>(),
    resourceContention: new Set<(details: { resource: string; requesters: string[] }) => void>()
  };

  private healthChecks = new Map<string, ServiceHealth>();
  private configurations = new Map<string, ServiceConfig>();
  private discoveryCache = new Map<string, ServiceDiscoveryInfo>();
  private versionRegistry = new Map<string, ServiceVersion>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(options: {
    healthCheckInterval?: number;
    enableDiscovery?: boolean;
    autoConfig?: boolean;
  } = {}) {
    this.metrics = {
      resourceEfficiency: 1,
      processingTime: 0,
      memoryUsage: 0
    };

    if (options.healthCheckInterval) {
      this.startHealthMonitoring(options.healthCheckInterval);
    }
  }

  private startHealthMonitoring(interval: number): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, service] of this.services.entries()) {
        if (service.health) {
          try {
            const health = await service.health();
            this.healthChecks.set(name, health);

            if (health.status !== 'healthy') {
              this.emit(ServiceEvent.ServiceDegraded, {
                service: name,
                health
              });
            }
          } catch (error) {
            this.handleError(ServiceEvent.HealthCheck, error);
          }
        }
      }
    }, interval);
  }

  public async registerService(
    name: string,
    service: Service,
    version?: ServiceVersion
  ): Promise<void> {
    if (this.services.has(name)) {
      throw new ServiceError('SERVICE_EXISTS', `Service ${name} already registered`);
    }

    if (version && service.dependencies?.length) {
      for (const dep of service.dependencies) {
        const depVersion = this.versionRegistry.get(dep);
        if (depVersion && !this.isCompatible(version, depVersion)) {
          throw new ServiceError('VERSION_INCOMPATIBLE',
            `Service ${name} v${version.major}.${version.minor}.${version.patch} is incompatible with dependency ${dep}`);
        }
      }
    }

    if (service.dependencies?.length) {
      const dependencies = Object.fromEntries(
        service.dependencies.map(dep => {
          const dependency = this.services.get(dep);
          if (!dependency) {
            throw new ServiceError('MISSING_DEPENDENCY', `Missing dependency: ${dep}`);
          }
          return [dep, dependency];
        })
      );
      await service.initialize?.(dependencies);
    } else {
      await service.initialize?.({});
    }

    this.services.set(name, service);
    this.state.set(name, {});
    if (version) {
      this.versionRegistry.set(name, version);
    }

    if (service.discover) {
      const info = await service.discover();
      this.discoveryCache.set(name, info);
      this.emit(ServiceEvent.ServiceDiscovered, info);
    }
  }

  public async removeService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new ServiceError('SERVICE_NOT_FOUND', `Service ${name} not found`);
    }

    await service.dispose?.();
    this.services.delete(name);
    this.state.delete(name);
  }

  public on(event: ServiceEvent, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  public onError(callback: (error: { service: string; error: Error }) => void): void {
    this.listeners.error.add(callback);
  }

  public onRecovery(
    callback: (details: { service: string; error: ServiceError }) => void
  ): void {
    this.listeners.recovery.add(callback);
  }

  public onStateConflict(
    callback: (details: { services: string[]; states: ServiceState[] }) => void
  ): void {
    this.listeners.stateConflict.add(callback);
  }

  public onResourceContention(
    callback: (details: { resource: string; requesters: string[] }) => void
  ): void {
    this.listeners.resourceContention.add(callback);
  }

  public setErrorHandler(service: string, handler: ErrorHandler): void {
    this.errorHandlers.set(service, handler);
  }

  public async dispatch(event: ServiceEvent, data: unknown): Promise<ServiceMetrics> {
    const startTime = performance.now();
    let cancelled = false;

    try {
      const handlers = this.eventHandlers.get(event) ?? new Set();
      for (const handler of handlers) {
        await handler(data, () => { cancelled = true; });
        if (cancelled) break;
      }

      this.metrics.processingTime = performance.now() - startTime;
      this.updateResourceMetrics();

      return { ...this.metrics };
    } catch (error) {
      await this.handleError(event, error);
      throw error;
    }
  }

  public getServiceState(service: string): ServiceState {
    const state = this.state.get(service);
    if (!state) {
      throw new ServiceError('SERVICE_NOT_FOUND', `Service ${service} not found`);
    }
    return { ...state };
  }

  public getStateHistory(): Array<Record<string, ServiceState>> {
    return [...this.stateHistory];
  }

  public registerSharedResource(type: string, data: SharedArrayBuffer): string {
    const id = crypto.randomUUID();
    this.resources.set(id, {
      id,
      type,
      data,
      usage: 0,
      locks: new Set()
    });
    return id;
  }

  public async releaseResource(id: string): Promise<void> {
    const resource = this.resources.get(id);
    if (!resource) {
      throw new ServiceError('RESOURCE_NOT_FOUND', `Resource ${id} not found`);
    }

    resource.usage = 0;
    resource.locks.clear();
  }

  public getResourceUsage(type: string): number {
    let totalUsage = 0;
    for (const resource of this.resources.values()) {
      if (resource.type === type) {
        totalUsage += resource.usage;
      }
    }
    return totalUsage;
  }

  private async handleError(event: ServiceEvent, error: unknown): Promise<void> {
    const serviceError = error instanceof ServiceError ? error :
      new ServiceError('UNKNOWN_ERROR', error instanceof Error ? error.message : String(error));

    const service = this.findAffectedService(event);
    if (!service) return;

    this.listeners.error.forEach(listener => {
      listener({ service, error: serviceError });
    });

    const handler = this.errorHandlers.get(service);
    if (handler) {
      const { retry } = await handler(serviceError);
      if (retry) {
        this.listeners.recovery.forEach(listener => {
          listener({ service, error: serviceError });
        });
      }
    }
  }

  private findAffectedService(event: ServiceEvent): string | undefined {
    switch (event) {
      case ServiceEvent.ProcessAudio:
      case ServiceEvent.AudioProcessed:
      case ServiceEvent.AudioError:
        return 'audio';
      case ServiceEvent.UpdateScene:
      case ServiceEvent.SceneUpdated:
      case ServiceEvent.SceneError:
        return 'scene';
      default:
        return undefined;
    }
  }

  private updateResourceMetrics(): void {
    let totalUsage = 0;
    let maxUsage = 0;

    for (const resource of this.resources.values()) {
      totalUsage += resource.usage;
      maxUsage = Math.max(maxUsage, resource.usage);
    }

    this.metrics.resourceEfficiency = maxUsage > 0 ? totalUsage / (maxUsage * this.resources.size) : 1;
    this.metrics.memoryUsage = totalUsage;
  }

  public async getServiceHealth(name: string): Promise<ServiceHealth> {
    const service = this.services.get(name);
    if (!service) {
      throw new ServiceError('SERVICE_NOT_FOUND', `Service ${name} not found`);
    }

    if (!service.health) {
      throw new ServiceError('HEALTH_CHECK_NOT_SUPPORTED',
        `Service ${name} does not support health checks`);
    }

    const health = await service.health();
    this.healthChecks.set(name, health);
    return health;
  }

  public async configureService(
    name: string,
    config: Partial<ServiceConfig>
  ): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new ServiceError('SERVICE_NOT_FOUND', `Service ${name} not found`);
    }

    if (!service.configure) {
      throw new ServiceError('CONFIG_NOT_SUPPORTED',
        `Service ${name} does not support configuration`);
    }

    const currentConfig = this.configurations.get(name) ?? {
      settings: {},
      defaults: {},
      overrides: {}
    };

    const newConfig = {
      ...currentConfig,
      settings: {
        ...currentConfig.settings,
        ...config.settings
      },
      overrides: {
        ...currentConfig.overrides,
        ...config.overrides
      }
    };

    await service.configure(newConfig);
    this.configurations.set(name, newConfig);
    this.emit(ServiceEvent.ConfigChanged, {
      service: name,
      config: newConfig
    });
  }

  public async discoverServices(capability?: string): Promise<ServiceDiscoveryInfo[]> {
    const discoveries = await Promise.all(
      Array.from(this.services.entries())
        .filter(([, service]) => service.discover)
        .map(async ([name, service]) => {
          try {
            const info = await service.discover!();
            this.discoveryCache.set(name, info);
            return info;
          } catch (error) {
            this.handleError(ServiceEvent.ServiceDiscovered, error);
            return null;
          }
        })
    );

    return discoveries
      .filter((info): info is ServiceDiscoveryInfo =>
        info !== null && (!capability || info.capabilities.includes(capability)));
  }

  private isCompatible(v1: ServiceVersion, v2: ServiceVersion): boolean {
    if (v1.major !== v2.major) return false;

    return v1.compatibleWith.some(v =>
      v2.compatibleWith.includes(v) ||
      v === `${v2.major}.${v2.minor}` ||
      v === `${v2.major}.${v2.minor}.${v2.patch}`
    );
  }

  private emit(event: ServiceEvent, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.handleError(event, error);
        }
      });
    }
  }

  public dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
