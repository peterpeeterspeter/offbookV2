export interface PerformanceReport {
  streaming: {
    streamLatency: number;
    processingTime: number;
    adaptiveBufferSize: number;
  };
  battery: {
    level: number;
    charging: boolean;
  };
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
}

export interface AudioProcessingMetrics {
  processingTime: number;
  bufferUnderruns: number;
  latency: number;
}

export interface NetworkCondition {
  rtt: number;
  type: '4g' | '3g' | 'slow-2g';
}

export class PerformanceAnalyzer {
  private metrics: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  async generatePerformanceReport(): Promise<PerformanceReport> {
    return {
      streaming: {
        streamLatency: this.getAverageMetric('latency') || 0,
        processingTime: this.getAverageMetric('processing') || 0,
        adaptiveBufferSize: this.calculateAdaptiveBufferSize()
      },
      battery: await this.getBatteryInfo()
    };
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const memory = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    return {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit
    };
  }

  async measureAudioProcessing(): Promise<AudioProcessingMetrics> {
    return {
      processingTime: this.getAverageMetric('audioProcessing') || 0,
      bufferUnderruns: this.getMetricCount('bufferUnderrun'),
      latency: this.getAverageMetric('audioLatency') || 0
    };
  }

  async measureNetworkResilience(conditions: {
    latency: number;
    jitter: number;
    packetLoss: number;
  }): Promise<{
    rtt: number;
    packetLoss: number;
    jitter: number;
  }> {
    return {
      rtt: conditions.latency,
      packetLoss: conditions.packetLoss,
      jitter: conditions.jitter
    };
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)?.push(value);
  }

  private getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private getMetricCount(name: string): number {
    return this.metrics.get(name)?.length || 0;
  }

  private calculateAdaptiveBufferSize(): number {
    const latency = this.getAverageMetric('latency') || 0;
    const jitter = this.getAverageMetric('jitter') || 0;
    return Math.max(256, Math.min(2048, Math.ceil((latency + jitter) * 48)));
  }

  private async getBatteryInfo(): Promise<{ level: number; charging: boolean }> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging
        };
      } catch {
        // Fallback if battery API is not available
        return {
          level: 1,
          charging: true
        };
      }
    }
    return {
      level: 1,
      charging: true
    };
  }
}
