"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceMetricsProps {
  thresholds: {
    latency: number;
    successRate: number;
  };
  severityThresholds: {
    latency: { critical: number; high: number; medium: number; low: number };
    successRate: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export default function PerformanceMetrics({
  thresholds,
  severityThresholds,
}: PerformanceMetricsProps) {
  const { data, isLoading } = useMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { performanceMetrics } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Average Latency</p>
            <p className="text-2xl font-bold">
              {performanceMetrics.averageLatency.toFixed(2)}ms
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">95th Percentile Latency</p>
            <p className="text-2xl font-bold">
              {performanceMetrics.p95Latency.toFixed(2)}ms
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Success Rate</p>
            <p className="text-2xl font-bold">
              {(performanceMetrics.successRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
