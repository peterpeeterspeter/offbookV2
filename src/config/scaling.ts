import type { ScalingConfig } from '@/types/scaling'

export const scalingConfig: ScalingConfig = {
  autoScaling: {
    enabled: true,
    minInstances: 1,
    maxInstances: 10,
    targetCPUUtilization: 70,
    targetMemoryUtilization: 80,
    cooldownPeriod: 300, // 5 minutes
    scaleUpThreshold: 80, // Scale up at 80% resource utilization
    scaleDownThreshold: 30, // Scale down at 30% resource utilization
    scaleUpFactor: 2, // Double instances when scaling up
    scaleDownFactor: 0.5, // Halve instances when scaling down
  },
  loadBalancing: {
    enabled: true,
    algorithm: 'round-robin',
    healthCheck: {
      path: '/api/health',
      interval: 30, // 30 seconds
      timeout: 5, // 5 seconds
      unhealthyThreshold: 3,
      healthyThreshold: 2,
    },
    sessionAffinity: true,
    stickySession: {
      enabled: true,
      timeout: 3600, // 1 hour
    },
  },
  resourceLimits: {
    cpu: {
      request: '100m',
      limit: '2000m',
    },
    memory: {
      request: '256Mi',
      limit: '1Gi',
    },
    storage: {
      request: '1Gi',
      limit: '10Gi',
    },
  },
  rateLimiting: {
    enabled: true,
    requestsPerSecond: 100,
    burstSize: 200,
    perIP: true,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 50, // 50% failure rate
    resetTimeout: 60, // 60 seconds
    halfOpenRequests: 3, // Number of requests to test in half-open state
  },
}
