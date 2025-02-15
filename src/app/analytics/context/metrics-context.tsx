"use client";

import React, { createContext, useContext, useState } from "react";
import type { UsageMetrics } from "@/services/monitoring/analytics-service";

interface MetricsContextType {
  timeRange: {
    start: number;
    end: number;
  };
  setTimeRange: (range: { start: number; end: number }) => void;
  metrics: UsageMetrics | null;
  setMetrics: (metrics: UsageMetrics | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: Error | null;
  setError: (error: Error | null) => void;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({
    start: Date.now() - 60 * 60 * 1000, // Default to last hour
    end: Date.now(),
  });
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  return (
    <MetricsContext.Provider
      value={{
        timeRange,
        setTimeRange,
        metrics,
        setMetrics,
        isLoading,
        setIsLoading,
        error,
        setError,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetricsContext() {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error("useMetricsContext must be used within a MetricsProvider");
  }
  return context;
}
