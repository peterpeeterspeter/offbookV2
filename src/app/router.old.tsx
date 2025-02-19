import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/error-boundary";
import { HydrationFallback } from "@/components/hydration-fallback";
import Home from "./page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <HydrationFallback>
        <Home />
      </HydrationFallback>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/scripts/:id",
    lazy: async () => {
      try {
        const { default: ScriptDetail } = await import("./scripts/detail/page");
        return {
          element: (
            <HydrationFallback>
              <ScriptDetail />
            </HydrationFallback>
          ),
          ErrorBoundary: RouteErrorBoundary,
        };
      } catch (error) {
        console.error("Error loading script detail page:", error);
        throw error;
      }
    },
  },
  {
    path: "/practice",
    lazy: async () => {
      try {
        const { default: Practice } = await import("./practice/page");
        return {
          element: (
            <HydrationFallback>
              <Practice />
            </HydrationFallback>
          ),
          ErrorBoundary: RouteErrorBoundary,
        };
      } catch (error) {
        console.error("Error loading practice page:", error);
        throw error;
      }
    },
  },
]);
