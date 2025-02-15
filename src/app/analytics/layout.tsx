"use client";

import { MetricsProvider } from "./context/metrics-context";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MetricsProvider>{children}</MetricsProvider>;
}
