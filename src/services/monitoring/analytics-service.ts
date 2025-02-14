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

      // Update metrics immediately
      const metrics = this.getLatestMetrics();
      const allLatencies = Array.from(this.activeSessions.values())
        .flatMap(s => s.performance.latencies);

      if (allLatencies.length > 0) {
        metrics.performanceMetrics.averageLatency = this.calculateAverage(allLatencies);
        metrics.performanceMetrics.p95Latency = this.calculateP95(allLatencies);
      }

      const totalRequests = session.performance.successes + session.performance.failures;
      if (totalRequests > 0) {
        metrics.performanceMetrics.successRate = session.performance.successes / totalRequests;
      }

      // Update historical metrics
      if (this.historicalMetrics.length > 0) {
        this.historicalMetrics[this.historicalMetrics.length - 1] = metrics;
      } else {
        this.historicalMetrics.push(metrics);
      }
    }
  }

  public getMetrics(timeRange?: { start: number; end: number }): UsageMetrics {
    if (!timeRange) {
      return this.getLatestMetrics();
    }

    const filteredMetrics = this.historicalMetrics.filter(
      metrics => metrics.timestamp >= timeRange.start && metrics.timestamp <= timeRange.end
    );

    if (filteredMetrics.length === 0) {
      return this.createEmptyMetrics();
    }

    return filteredMetrics[filteredMetrics.length - 1]!;
  }

  private recordSessionMetrics(session: SessionData): void {
    const metrics = this.getLatestMetrics();
    metrics.totalSessions++;
    metrics.activeUsers = this.activeSessions.size;

    const duration = (session.endTime || Date.now()) - session.startTime;
    metrics.averageSessionDuration = this.calculateAverageSessionDuration();

    // Update feature usage
    session.features.forEach(feature => {
      metrics.featureUsage[feature] = (metrics.featureUsage[feature] || 0) + 1;
    });

    // Update browser and device stats
    metrics.browserStats[session.browser] = (metrics.browserStats[session.browser] || 0) + 1;
    metrics.deviceStats[session.device] = (metrics.deviceStats[session.device] || 0) + 1;

    // Update error metrics
    metrics.totalErrors += session.errors;
    metrics.errorRate = this.calculateErrorRate();

    // Update historical metrics
    if (this.historicalMetrics.length > 0) {
      this.historicalMetrics[this.historicalMetrics.length - 1] = metrics;
    } else {
      this.historicalMetrics.push(metrics);
    }

    // Log session metrics
    loggingService.info('Recording session metrics', {
      userId: session.userId,
      duration,
      errors: session.errors,
      features: Array.from(session.features),
      performance: {
        successes: session.performance.successes,
        failures: session.performance.failures,
        latencies: session.performance.latencies
      }
    });
  }

  private getLatestMetrics(): UsageMetrics {
    if (this.historicalMetrics.length === 0) {
      const emptyMetrics = this.createEmptyMetrics();
      this.historicalMetrics.push(emptyMetrics);
      return emptyMetrics;
    }
    return this.historicalMetrics[this.historicalMetrics.length - 1]!;
  }

  private createEmptyMetrics(): UsageMetrics {
    return {
      timestamp: Date.now(),
      totalSessions: 0,
      activeUsers: 0,
      averageSessionDuration: 0,
      totalErrors: 0,
      errorRate: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        network: 0
      },
      featureUsage: {},
      browserStats: {},
      deviceStats: {},
      performanceMetrics: {
        averageLatency: 0,
        p95Latency: 0,
        successRate: 1
      }
    };
  }

  private calculateAverageSessionDuration(): number {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      const endTime = session.endTime || Date.now();
      return sum + (endTime - session.startTime);
    }, 0);

    return totalDuration / sessions.length;
  }

  private calculateErrorRate(): number {
    const metrics = this.getLatestMetrics();
    const totalSessions = metrics.totalSessions;
    if (totalSessions === 0) return 0;

    const totalErrors = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.errors, 0);

    return totalErrors / totalSessions;
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateP95(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  private getBrowserInfo(): string {
    // Simple browser detection - can be enhanced
    return 'Other';
  }

  private getDeviceInfo(): string {
    // Simple device detection - can be enhanced
    return 'Desktop';
  }

  private collectMetrics(): void {
    const currentMetrics = this.createEmptyMetrics();
    currentMetrics.activeUsers = this.activeSessions.size;
    currentMetrics.totalSessions = this.getLatestMetrics().totalSessions;
    this.historicalMetrics.push(currentMetrics);
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.METRICS_RETENTION * 24 * 60 * 60 * 1000);
    this.historicalMetrics = this.historicalMetrics.filter(
      metrics => metrics.timestamp >= cutoffTime
    );
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
