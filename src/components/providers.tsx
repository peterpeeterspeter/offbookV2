"use client";

import React from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ConfigProvider } from "@/providers/config-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent flash of unstyled content during hydration
  if (!mounted) {
    return null;
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
