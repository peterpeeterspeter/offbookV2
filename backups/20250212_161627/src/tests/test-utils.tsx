import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { vi } from "vitest";
import type { EmotionMetrics } from "@/types/emotions";

// Mock next-themes
const mockThemeContext = {
  theme: "light",
  setTheme: vi.fn(),
  themes: ["light", "dark"],
  systemTheme: "light",
  resolvedTheme: "light",
};

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => mockThemeContext),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="theme-provider">{children}</div>;
  },
}));

// Mock toaster
vi.mock("@/components/ui/toaster", () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
  })),
  Toaster: () => null,
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="all-providers">{children}</div>
);

const customRender = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> = {}
) => {
  // @ts-expect-error - Known type issue with @testing-library/react render function types
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Type assertion helper
export function assertIsReactComponent<T>(
  component: React.ComponentType<T>
): asserts component is React.ComponentType<T> {
  if (!component) {
    throw new Error("Component is undefined");
  }
}

/**
 * Creates mock emotion metrics for testing
 */
export function createMockEmotionMetrics(
  overrides?: Partial<EmotionMetrics>
): EmotionMetrics {
  return {
    emotionMatch: 0.8,
    intensityMatch: 0.7,
    timingAccuracy: 0.9,
    overallScore: 0.8,
    ...overrides,
  };
}
