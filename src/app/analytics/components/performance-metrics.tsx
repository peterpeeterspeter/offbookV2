import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMetrics } from "@/hooks/use-metrics";
import { formatDuration, formatBytes } from "@/lib/utils";

interface PerformanceMetricsProps {
  thresholds: {
    memory: number;
    cpu: number;
    latency: number;
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
    ttfb: number;
    audioLatency: number;
    batteryDrain: number;
  };
  severityThresholds: {
    latency: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export function PerformanceMetrics({
  thresholds,
  severityThresholds,
}: PerformanceMetricsProps) {
  const { data: metrics } = useMetrics();

  if (!metrics) {
    return <Card className="h-96 animate-pulse" />;
  }

  const getSeverityColor = (value: number, threshold: number) => {
    const percentage = (value / threshold) * 100;
    if (percentage >= severityThresholds.latency.critical) return "bg-red-500";
    if (percentage >= severityThresholds.latency.high) return "bg-orange-500";
    if (percentage >= severityThresholds.latency.medium) return "bg-yellow-500";
    return "bg-green-500";
  };

  const performanceMetrics = [
    {
      name: "Average Latency",
      value: metrics.performanceMetrics.averageLatency,
      threshold: thresholds.latency,
      format: formatDuration,
    },
    {
      name: "P95 Latency",
      value: metrics.performanceMetrics.p95Latency,
      threshold: thresholds.latency,
      format: formatDuration,
    },
    {
      name: "First Contentful Paint",
      value: metrics.performanceMetrics.fcp || 0,
      threshold: thresholds.fcp,
      format: formatDuration,
    },
    {
      name: "Largest Contentful Paint",
      value: metrics.performanceMetrics.lcp || 0,
      threshold: thresholds.lcp,
      format: formatDuration,
    },
    {
      name: "Cumulative Layout Shift",
      value: metrics.performanceMetrics.cls || 0,
      threshold: thresholds.cls,
      format: (value: number) => value.toFixed(3),
    },
    {
      name: "First Input Delay",
      value: metrics.performanceMetrics.fid || 0,
      threshold: thresholds.fid,
      format: formatDuration,
    },
    {
      name: "Time to First Byte",
      value: metrics.performanceMetrics.ttfb || 0,
      threshold: thresholds.ttfb,
      format: formatDuration,
    },
    {
      name: "Audio Latency",
      value: metrics.performanceMetrics.audioLatency || 0,
      threshold: thresholds.audioLatency,
      format: formatDuration,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {performanceMetrics.map((metric) => (
          <div key={metric.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{metric.name}</span>
              <span>{metric.format(metric.value)}</span>
            </div>
            <Progress
              value={(metric.value / metric.threshold) * 100}
              className={getSeverityColor(metric.value, metric.threshold)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
