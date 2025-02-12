export interface StreamingMetrics {
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
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
}

export interface PipelineMetrics {
  totalRequests: number;
  errors: number;
  slowThreshold: number;
  slowOperations: number;
  averageLatency: number;
  throughput: number;
  errorRate: number;
  queueUtilization: number;
  batchEfficiency: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  ratio: number;
  totalRequests: number;
  averageLatency: number;
  frequentItemsRatio: number;
  uptime: number;
}

export interface PerformanceMetrics {
  type: string;
  name: string;
  duration: number;
  timestamp: number;
  pipeline: PipelineMetrics;
  cache: CacheMetrics;
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapLimit: number;
  };
  battery: {
    level: number;
    charging: boolean;
  };
  streaming: StreamingMetrics;
  resources: {
    cpu: {
      percentage: number;
    };
    network: {
      bandwidth: number;
      latency: number;
    };
  };
}

// Extend the Navigator interface to include getBattery
declare global {
  interface Navigator {
    getBattery(): Promise<{
      level: number;
      charging: boolean;
      chargingTime: number;
      dischargingTime: number;
      addEventListener: (type: string, listener: EventListener) => void;
      removeEventListener: (type: string, listener: EventListener) => void;
    }>;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  // Declare global gc function type
  interface Window {
    gc?: () => void;
  }
}
