"use client";

import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  monitoringConfig,
  ERROR_SEVERITY_THRESHOLDS,
} from "@/config/monitoring";
import dynamic from "next/dynamic";
import { MetricsProvider } from "./context/metrics-context";
import type { ComponentType } from "react";

// Define a type for the dynamic components
type DynamicComponent = ComponentType<any>;

// Define the dynamic imports with proper type assertions
const PerformanceMetrics = dynamic(
  () => import("./components/performance-metrics").then((mod) => mod.default),
  {
    loading: () => <Card className="h-96 animate-pulse" />,
    ssr: false,
  }
) as DynamicComponent;

const ErrorMetrics = dynamic(
  () => import("./components/error-metrics").then((mod) => mod.default),
  {
    loading: () => <Card className="h-96 animate-pulse" />,
    ssr: false,
  }
) as DynamicComponent;

const ResourceUsage = dynamic(
  () => import("./components/resource-usage").then((mod) => mod.default),
  {
    loading: () => <Card className="h-96 animate-pulse" />,
    ssr: false,
  }
) as DynamicComponent;

const SessionMetrics = dynamic(
  () => import("./components/session-metrics").then((mod) => mod.default),
  {
    loading: () => <Card className="h-32 animate-pulse" />,
    ssr: false,
  }
) as DynamicComponent;

const MetricsTimeRange = dynamic(
  () => import("./components/metrics-time-range").then((mod) => mod.default),
  {
    loading: () => <Card className="h-12 w-96 animate-pulse" />,
    ssr: false,
  }
) as DynamicComponent;

export default function AnalyticsDashboard() {
  return (
    <MetricsProvider>
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <Suspense fallback={<Card className="h-12 w-96 animate-pulse" />}>
            <MetricsTimeRange />
          </Suspense>
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
                  thresholds={{
                    latency: monitoringConfig.performance.thresholds.latency,
                    successRate:
                      monitoringConfig.performance.thresholds.successRate ??
                      0.99,
                  }}
                  severityThresholds={{
                    latency: ERROR_SEVERITY_THRESHOLDS.latency,
                    successRate: ERROR_SEVERITY_THRESHOLDS.successRate,
                  }}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Suspense fallback={<Card className="h-96 animate-pulse" />}>
                <ErrorMetrics />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Suspense fallback={<Card className="h-96 animate-pulse" />}>
                <ResourceUsage />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MetricsProvider>
  );
}
