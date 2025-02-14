export interface ScalingConfig {
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
    cooldownPeriod: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    scaleUpFactor: number;
    scaleDownFactor: number;
  };
  loadBalancing: {
    enabled: boolean;
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash';
    healthCheck: {
      path: string;
      interval: number;
      timeout: number;
      unhealthyThreshold: number;
      healthyThreshold: number;
    };
    sessionAffinity: boolean;
    stickySession: {
      enabled: boolean;
      timeout: number;
    };
  };
  resourceLimits: {
    cpu: {
      request: string;
      limit: string;
    };
    memory: {
      request: string;
      limit: string;
    };
    storage: {
      request: string;
      limit: string;
    };
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
    perIP: boolean;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
  };
}
