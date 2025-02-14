"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ErrorMetricsProps {
  thresholds: {
    warning: number;
    error: number;
    critical: number;
  };
}

export function ErrorMetrics({ thresholds }: ErrorMetricsProps) {
  const { data, isLoading } = useMetrics();

  if (isLoading || !data) {
    return <Card className="h-96 animate-pulse" />;
  }

  const errorRate = data.errorRate || 0;
  const severity = getSeverity(errorRate, thresholds);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-2xl font-bold ${getSeverityColor(severity)}`}
            >
              {errorRate.toFixed(2)}%
            </span>
            <span className={`text-sm ${getSeverityColor(severity)}`}>
              {severity.toUpperCase()}
            </span>
          </div>
          <Progress
            value={errorRate}
            max={100}
            className={getSeverityProgressColor(severity)}
          />
          <div className="text-sm text-muted-foreground">
            <p>Thresholds:</p>
            <ul className="list-disc list-inside">
              <li>Warning: {thresholds.warning}%</li>
              <li>Error: {thresholds.error}%</li>
              <li>Critical: {thresholds.critical}%</li>
            </ul>
          </div>
          {data.totalErrors > 0 && (
            <div className="text-sm text-muted-foreground">
              Total Errors: {data.totalErrors}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getSeverity(
  rate: number,
  thresholds: ErrorMetricsProps["thresholds"]
): "normal" | "warning" | "error" | "critical" {
  if (rate >= thresholds.critical) return "critical";
  if (rate >= thresholds.error) return "error";
  if (rate >= thresholds.warning) return "warning";
  return "normal";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "error":
      return "text-orange-600";
    case "warning":
      return "text-yellow-600";
    default:
      return "text-green-600";
  }
}

function getSeverityProgressColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-600";
    case "error":
      return "bg-orange-600";
    case "warning":
      return "bg-yellow-600";
    default:
      return "bg-green-600";
  }
}
