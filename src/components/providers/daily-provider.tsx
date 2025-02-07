"use client";

import { DailyProvider } from "@daily-co/daily-react";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface DailyVideoProviderProps {
  children: ReactNode;
}

function HydrationFallback() {
  return (
    <div className="flex items-center justify-center min-h-[100px]">
      <p className="text-gray-500">Initializing audio call...</p>
    </div>
  );
}

function validateEnvironment() {
  const apiKey = import.meta.env.VITE_DAILY_API_KEY;
  const domain = import.meta.env.VITE_DAILY_DOMAIN;

  if (!apiKey) throw new Error("VITE_DAILY_API_KEY is not set in environment");
  if (!domain) throw new Error("VITE_DAILY_DOMAIN is not set in environment");

  return { apiKey, domain };
}

export function DailyVideoProvider({ children }: DailyVideoProviderProps) {
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      validateEnvironment();
      setIsConfigValid(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to validate environment"
      );
      console.error("Daily.co configuration error:", err);
    }
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        <p>Configuration Error: {error}</p>
      </div>
    );
  }

  if (!isConfigValid) {
    return <HydrationFallback />;
  }

  return (
    <Suspense fallback={<HydrationFallback />}>
      <DailyProvider>{children}</DailyProvider>
    </Suspense>
  );
}
