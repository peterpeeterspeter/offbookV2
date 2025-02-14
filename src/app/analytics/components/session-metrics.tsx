"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionMetrics() {
  const { data, isLoading } = useMetrics();

  if (isLoading || !data) {
    return <Card className="h-32 animate-pulse" />;
  }

  const { totalSessions, activeUsers, averageSessionDuration } = data;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeUsers}</div>
          <p className="text-xs text-muted-foreground">Current active users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions}</div>
          <p className="text-xs text-muted-foreground">All-time sessions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(averageSessionDuration)}
          </div>
          <p className="text-xs text-muted-foreground">Per session</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(data.performanceMetrics.successRate * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">Request success rate</p>
        </CardContent>
      </Card>
    </>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
