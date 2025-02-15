"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResourceUsage() {
  const { data, isLoading } = useMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
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

  const { resourceUsage } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">CPU Usage</p>
            <p className="text-2xl font-bold">
              {resourceUsage.cpu.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Memory Usage</p>
            <p className="text-2xl font-bold">
              {resourceUsage.memory.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Network Usage</p>
            <p className="text-2xl font-bold">
              {resourceUsage.network.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
