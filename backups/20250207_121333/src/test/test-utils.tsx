import React from "react";
import { render as rtlRender } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/app/providers";
import { vi } from "vitest";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
  }),
}));

function render(ui: React.ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Providers>{children}</Providers>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { render };

// Type assertion helper
export function assertType<T>(value: any): asserts value is T {
  return;
}

// Helper to assert component props
export function assertProps<T>(props: T): T {
  return props;
}

// Helper to assert React component type
export function assertComponent<T>(
  component: React.ReactElement<T>
): React.ReactElement<T> {
  return component;
}
