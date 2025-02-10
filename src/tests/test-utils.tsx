import React from "react";
import {
  render as rtlRender,
  RenderOptions,
  RenderResult,
} from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { vi } from "vitest";

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
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    {children}
    <Toaster />
  </ThemeProvider>
);

const render = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders>{children}</AllProviders>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { render };

// Type assertion helper
export function assertIsReactComponent<T>(
  component: React.ComponentType<T>
): asserts component is React.ComponentType<T> {
  if (!component) {
    throw new Error("Component is undefined");
  }
}
