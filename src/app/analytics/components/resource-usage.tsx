"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ResourceUsageProps {
  thresholds: {
    memory: {
      warning: number;
      error: number;
      critical: number;
    };
    cpu: {
      warning: number;
      error: number;
      critical: number;
    };
  };
}

export function ResourceUsage({ thresholds }: ResourceUsageProps) {
  const { data, isLoading } = useMetrics();

  if (isLoading || !data) {
    return <Card className="h-96 animate-pulse" />;
  }

  const { cpu, memory, network } = data.resourceUsage;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CPU Usage</span>
              <span
                className={`text-sm ${getSeverityColor(getSeverity(cpu, thresholds.cpu))}`}
              >
                {cpu.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={cpu}
              max={100}
              className={getSeverityProgressColor(
                getSeverity(cpu, thresholds.cpu)
              )}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <span
                className={`text-sm ${getSeverityColor(getSeverity(memory, thresholds.memory))}`}
              >
                {memory.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={memory}
              max={100}
              className={getSeverityProgressColor(
                getSeverity(memory, thresholds.memory)
              )}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network Usage</span>
              <span className="text-sm">{formatNetworkUsage(network)}</span>
            </div>
            <Progress value={network} max={100} />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Thresholds:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">CPU:</p>
                <ul className="list-disc list-inside">
                  <li>Warning: {thresholds.cpu.warning}%</li>
                  <li>Error: {thresholds.cpu.error}%</li>
                  <li>Critical: {thresholds.cpu.critical}%</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Memory:</p>
                <ul className="list-disc list-inside">
                  <li>Warning: {thresholds.memory.warning}%</li>
                  <li>Error: {thresholds.memory.error}%</li>
                  <li>Critical: {thresholds.memory.critical}%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getSeverity(
  value: number,
  thresholds: { warning: number; error: number; critical: number }
): "normal" | "warning" | "error" | "critical" {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.error) return "error";
  if (value >= thresholds.warning) return "warning";
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

function formatNetworkUsage(usage: number): string {
  if (usage < 1024) return `${usage.toFixed(1)} KB/s`;
  if (usage < 1024 * 1024) return `${(usage / 1024).toFixed(1)} MB/s`;
  return `${(usage / (1024 * 1024)).toFixed(1)} GB/s`;
}
