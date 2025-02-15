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

function ErrorDisplay() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Initialization Error
        </h1>
        <p className="text-gray-600 mb-4">
          The application failed to initialize properly. This is likely due to
          missing or invalid environment variables.
        </p>
        <p className="text-sm text-gray-500">
          Please check the application logs for more details.
        </p>
      </div>
    </div>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        setMounted(true);
      } catch (err) {
        logger.error({
          message: "Failed to initialize application",
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    init();
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Initializing...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay />;
  }

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
