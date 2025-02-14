import { loggingService } from './logging-service';

export interface UsageMetrics {
  timestamp: number;
  totalSessions: number;
  activeUsers: number;
  averageSessionDuration: number;
  totalErrors: number;
  errorRate: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  featureUsage: Record<string, number>;
  browserStats: Record<string, number>;
  deviceStats: Record<string, number>;
  performanceMetrics: {
    averageLatency: number;
    p95Latency: number;
    successRate: number;
  };
}

export interface SessionData {
  userId: string;
  startTime: number;
  endTime?: number;
  features: Set<string>;
  errors: number;
  browser: string;
  device: string;
  performance: {
    latencies: number[];
    successes: number;
    failures: number;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private activeSessions: Map<string, SessionData> = new Map();
  private historicalMetrics: UsageMetrics[] = [];
  private readonly METRICS_RETENTION = 30; // Days to keep metrics

  private constructor() {
    this.initializeMetricsCollection();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private initializeMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Clean up old metrics daily
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  public startSession(userId: string): void {
    const browserInfo = this.getBrowserInfo();
    const deviceInfo = this.getDeviceInfo();

    this.activeSessions.set(userId, {
      userId,
      startTime: Date.now(),
      features: new Set(),
      errors: 0,
      browser: browserInfo,
      device: deviceInfo,
      performance: {
        latencies: [],
        successes: 0,
        failures: 0
      }
    });

    loggingService.info('Session started', { userId, browser: browserInfo, device: deviceInfo });
  }

  public endSession(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.endTime = Date.now();
      this.recordSessionMetrics(session);
      this.activeSessions.delete(userId);
      loggingService.info('Session ended', {
        userId,
        duration: session.endTime - session.startTime,
        features: Array.from(session.features)
      });
    }
  }

  public trackFeatureUsage(userId: string, feature: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.features.add(feature);
    }
  }

  public trackError(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.errors++;
    }
  }

  public trackPerformance(userId: string, latency: number, success: boolean): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.performance.latencies.push(latency);
      if (success) {
        session.performance.successes++;
      } else {
        session.performance.failures++;
      }
    }
  }

  public getMetrics(timeRange?: { start: number; end: number }): UsageMetrics {
    const currentMetrics = this.collectMetrics();

    if (!timeRange) {
      return currentMetrics;
    }

    // Filter historical metrics within time range
    const relevantMetrics = this.historicalMetrics.filter(
      metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );

    // Aggregate metrics over time range
    return this.aggregateMetrics([...relevantMetrics, currentMetrics]);
  }

  private collectMetrics(): UsageMetrics {
    const now = Date.now();
    const metrics: UsageMetrics & { timestamp?: number } = {
      timestamp: now,
      totalSessions: this.activeSessions.size,
      activeUsers: this.getActiveUserCount(),
      averageSessionDuration: this.calculateAverageSessionDuration(),
      totalErrors: this.calculateTotalErrors(),
      errorRate: this.calculateErrorRate(),
      resourceUsage: this.getResourceUsage(),
      featureUsage: this.aggregateFeatureUsage(),
      browserStats: this.aggregateBrowserStats(),
      deviceStats: this.aggregateDeviceStats(),
      performanceMetrics: this.calculatePerformanceMetrics()
    };

    this.historicalMetrics.push(metrics);
    return metrics;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.METRICS_RETENTION * 24 * 60 * 60 * 1000);
    this.historicalMetrics = this.historicalMetrics.filter(
      metric => metric.timestamp && metric.timestamp > cutoff
    );
  }

  private getActiveUserCount(): number {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return Array.from(this.activeSessions.values()).filter(
      session => !session.endTime || session.endTime > fiveMinutesAgo
    ).length;
  }

  private calculateAverageSessionDuration(): number {
    const completedSessions = Array.from(this.activeSessions.values())
      .filter((session): session is SessionData & { endTime: number } =>
        session.endTime !== undefined
      );

    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce(
      (sum, session) => sum + (session.endTime - session.startTime),
      0
    );

    return totalDuration / completedSessions.length;
  }

  private calculateTotalErrors(): number {
    return Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.errors, 0);
  }

  private calculateErrorRate(): number {
    const totalRequests = Array.from(this.activeSessions.values())
      .reduce((sum, session) =>
        sum + session.performance.successes + session.performance.failures,
        0
      );

    if (totalRequests === 0) return 0;

    const totalErrors = this.calculateTotalErrors();
    return totalErrors / totalRequests;
  }

  private getResourceUsage(): UsageMetrics['resourceUsage'] {
    // This would ideally come from actual system metrics
    return {
      cpu: 0,
      memory: 0,
      network: 0
    };
  }

  private aggregateFeatureUsage(): Record<string, number> {
    const usage: Record<string, number> = {};

    this.activeSessions.forEach(session => {
      session.features.forEach(feature => {
        usage[feature] = (usage[feature] || 0) + 1;
      });
    });

    return usage;
  }

  private aggregateBrowserStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.activeSessions.forEach(session => {
      stats[session.browser] = (stats[session.browser] || 0) + 1;
    });

    return stats;
  }

  private aggregateDeviceStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.activeSessions.forEach(session => {
      stats[session.device] = (stats[session.device] || 0) + 1;
    });

    return stats;
  }

  private calculatePerformanceMetrics(): UsageMetrics['performanceMetrics'] {
    const allLatencies = Array.from(this.activeSessions.values())
      .flatMap(session => session.performance.latencies);

    if (allLatencies.length === 0) {
      return {
        averageLatency: 0,
        p95Latency: 0,
        successRate: 0
      };
    }

    const totalSuccesses = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.performance.successes, 0);

    const totalRequests = Array.from(this.activeSessions.values())
      .reduce((sum, session) =>
        sum + session.performance.successes + session.performance.failures,
        0
      );

    return {
      averageLatency: this.calculateAverage(allLatencies),
      p95Latency: this.calculatePercentile(allLatencies, 95),
      successRate: totalRequests > 0 ? totalSuccesses / totalRequests : 0
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private getBrowserInfo(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = window.navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'unknown';

    if (/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) return 'iOS';
    if (/Android/i.test(window.navigator.userAgent)) return 'Android';
    return 'Desktop';
  }

  private aggregateMetrics(metrics: (UsageMetrics & { timestamp?: number })[]): UsageMetrics {
    // Implementation for aggregating multiple metrics into one
    return metrics.reduce((acc, curr) => ({
      totalSessions: acc.totalSessions + curr.totalSessions,
      activeUsers: Math.max(acc.activeUsers, curr.activeUsers),
      averageSessionDuration: (acc.averageSessionDuration + curr.averageSessionDuration) / 2,
      totalErrors: acc.totalErrors + curr.totalErrors,
      errorRate: (acc.errorRate + curr.errorRate) / 2,
      resourceUsage: {
        cpu: Math.max(acc.resourceUsage.cpu, curr.resourceUsage.cpu),
        memory: Math.max(acc.resourceUsage.memory, curr.resourceUsage.memory),
        network: acc.resourceUsage.network + curr.resourceUsage.network
      },
      featureUsage: this.mergeRecords(acc.featureUsage, curr.featureUsage),
      browserStats: this.mergeRecords(acc.browserStats, curr.browserStats),
      deviceStats: this.mergeRecords(acc.deviceStats, curr.deviceStats),
      performanceMetrics: {
        averageLatency: (acc.performanceMetrics.averageLatency + curr.performanceMetrics.averageLatency) / 2,
        p95Latency: Math.max(acc.performanceMetrics.p95Latency, curr.performanceMetrics.p95Latency),
        successRate: (acc.performanceMetrics.successRate + curr.performanceMetrics.successRate) / 2
      }
    }));
  }

  private mergeRecords(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    const result = { ...a };
    Object.entries(b).forEach(([key, value]) => {
      result[key] = (result[key] || 0) + value;
    });
    return result;
  }

  private recordSessionMetrics(session: SessionData): void {
    const duration = (session.endTime || Date.now()) - session.startTime;
    loggingService.info('Recording session metrics', {
      userId: session.userId,
      duration,
      features: Array.from(session.features),
      errors: session.errors,
      performance: session.performance
    });
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
