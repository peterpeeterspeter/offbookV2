export interface ServiceMetrics {
  timestamp: number;
  service: string;
  metrics: {
    latency: number;
    throughput: number;
    errorRate: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
    customMetrics?: Record<string, number>;
  };
  pipeline: PipelineMetrics;
  cache: CacheMetrics;
  streaming?: StreamingMetrics;
}

export interface MetricsHistory {
  serviceId: string;
  metrics: ServiceMetrics[];
  aggregates: {
    averageLatency: number;
    peakThroughput: number;
    errorRatePercentile: number;
    resourceUtilization: {
      averageCpu: number;
      averageMemory: number;
      peakNetwork: number;
    };
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'error';
  service: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface PracticeMetrics {
  emotionMatch: number;
  intensityMatch: number;
  timingAccuracy: number;
  overallScore: number;
  timing?: {
    averageDelay: number;
    maxDelay: number;
    minDelay: number;
    responseDelays: number[];
  };
  accuracy?: {
    correctLines: number;
    totalLines: number;
    accuracy: number;
  };
  emotions?: {
    matchedEmotions: number;
    totalEmotionalCues: number;
    emotionAccuracy: number;
  };
}

export interface PerformanceMetrics {
  type: string;
  name: string;
  duration: number;
  timestamp: number;
  pipeline: PipelineMetrics;
  cache: CacheMetrics;
  streaming?: StreamingMetrics;
  context?: {
    memory?: {
      heapUsed: number;
      heapTotal: number;
      heapLimit: number;
    };
    cpu?: {
      usage: number;
      cores: number;
    };
    battery?: {
      level: number;
      charging: boolean;
    };
  };
}

export interface PipelineMetrics {
  totalRequests: number;
  errors: number;
  errorRate: number;
  averageLatency: number;
  throughput: number;
  queueUtilization: number;
  batchEfficiency: number;
  slowThreshold: number;
  slowOperations: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  ratio: number;
  totalRequests: number;
  averageLatency: number;
  frequentItemsRatio: number;
  uptime: number;
}

export interface StreamingMetrics {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  bufferUtilization: number;
  streamLatency: number;
  dropoutCount: number;
  recoveryTime: number;
  activeStreams: number;
  processingTime: number;
  networkLatency: number;
  adaptiveBufferSize: number;
  voiceChangeLatency: number;
  reconnectionCount: number;
  partialDataSize: number;
}
