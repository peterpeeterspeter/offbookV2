"use client";

import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ErrorMetrics() {
  const { data, isLoading } = useMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Total Errors</p>
            <p className="text-2xl font-bold">{data.totalErrors}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Error Rate</p>
            <p className="text-2xl font-bold">
              {(data.errorRate * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
