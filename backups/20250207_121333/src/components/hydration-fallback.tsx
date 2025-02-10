import { useEffect, useState, type ReactNode } from "react";

interface HydrationFallbackProps {
  children: ReactNode;
}

export function HydrationFallback({ children }: HydrationFallbackProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading content...</p>
      </div>
    );
  }

  return <>{children}</>;
}
