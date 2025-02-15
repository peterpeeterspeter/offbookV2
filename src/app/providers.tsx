"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Suspense, useState } from "react";
import { DailyVideoProvider } from "@/components/providers/daily-provider";
import { GlobalErrorBoundary } from "@/components/global-error-boundary";
import { HydrationFallback } from "@/components/hydration-fallback";

interface ProvidersProps {
  children: React.ReactNode;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading application...</p>
    </div>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingFallback />}>
          <DailyVideoProvider>
            <HydrationFallback>{children}</HydrationFallback>
          </DailyVideoProvider>
        </Suspense>
        <Toaster />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
