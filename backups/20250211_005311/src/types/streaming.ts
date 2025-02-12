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

export interface PerformanceMetrics {
  type: string;
  name: string;
  duration: number;
  timestamp: number;
  pipeline: PipelineMetrics;
  cache: CacheMetrics;
  streaming?: StreamingMetrics;
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
