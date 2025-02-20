"use client";

import React, { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ConfigProvider } from "@/providers/config-provider";
import { initializeApp } from "@/lib/init";
import { logger } from "@/lib/logger";

interface ProvidersProps {
  children: React.ReactNode;
}

function ErrorDisplay({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Initialization Error
        </h1>
        <p className="text-gray-600 mb-4">
          {error.message || "The application failed to initialize properly."}
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Please try the following:</p>
          <ul className="list-disc list-inside text-sm text-gray-500">
            <li>Refresh the page</li>
            <li>Clear your browser cache</li>
            <li>Check your internet connection</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      if (process.env.NODE_ENV === "development") {
        setMounted(true);
        return;
      }

      try {
        await initializeApp();
        setMounted(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({
          message: "Failed to initialize application",
          error: error.message,
        });
        setError(error);
      }
    };

    init();
  }, []);

  // Show loading state
  if (!mounted && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Initializing...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Main application with providers
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ConfigProvider>
          <ToastProvider>{children}</ToastProvider>
        </ConfigProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
