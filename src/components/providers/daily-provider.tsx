"use client";

import { DailyProvider } from "@daily-co/daily-react";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { HydrationFallback } from "@/components/hydration-fallback";
import { useConfig } from "@/providers/config-provider";

interface DailyVideoProviderProps {
  children: ReactNode;
}

export function DailyVideoProvider({ children }: DailyVideoProviderProps) {
  const { config, isValid, errors } = useConfig();
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        <p>Configuration Error: {error}</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        <p>Invalid configuration. Please check your settings.</p>
        <div className="mt-2 text-sm text-gray-500">
          {errors.map((error, index) => (
            <div key={index}>
              {error.path}: {error.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={<HydrationFallback>Loading Daily.co...</HydrationFallback>}
    >
      <DailyProvider>{children}</DailyProvider>
    </Suspense>
  );
}
