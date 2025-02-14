import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  monitoringConfig,
  ERROR_SEVERITY_THRESHOLDS,
} from "@/config/monitoring";
import { PerformanceMetrics } from "./components/performance-metrics";
import { ErrorMetrics } from "./components/error-metrics";
import { ResourceUsage } from "./components/resource-usage";
import { SessionMetrics } from "./components/session-metrics";
import { MetricsTimeRange } from "./components/metrics-time-range";

export default function AnalyticsDashboard() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <MetricsTimeRange />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Suspense fallback={<Card className="h-32 animate-pulse" />}>
              <SessionMetrics />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<Card className="h-96 animate-pulse" />}>
              <PerformanceMetrics
                thresholds={monitoringConfig.performance.thresholds}
                severityThresholds={ERROR_SEVERITY_THRESHOLDS}
              />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<Card className="h-96 animate-pulse" />}>
              <ErrorMetrics thresholds={ERROR_SEVERITY_THRESHOLDS.errorRate} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<Card className="h-96 animate-pulse" />}>
              <ResourceUsage
                thresholds={{
                  memory: ERROR_SEVERITY_THRESHOLDS.memory,
                  cpu: ERROR_SEVERITY_THRESHOLDS.cpu,
                  battery: ERROR_SEVERITY_THRESHOLDS.batteryDrain,
                }}
              />
            </Suspense>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
