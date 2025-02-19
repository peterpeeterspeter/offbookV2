"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface HydrationFallbackProps {
  children: ReactNode;
}

export function HydrationFallback({ children }: HydrationFallbackProps) {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
