import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { vi } from "vitest";
import type { EmotionMetrics } from "@/types/emotions";

/**
 * This file contains test utilities with proper type definitions to handle
 * conflicts between different versions of @types/react in the project.
 */

// Mock next-themes
const mockTheme = {
  theme: "light",
  setTheme: vi.fn(),
  themes: ["light", "dark"],
  systemTheme: "light",
  resolvedTheme: "light",
};

// Create a type-safe mock ThemeProvider
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div data-testid="theme-provider">{children}</div>;

vi.mock("next-themes", () => ({
  useTheme: () => mockTheme,
  ThemeProvider: MockThemeProvider,
}));

// Mock toaster
vi.mock("@/components/ui/toaster", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  Toaster: () => null,
}));

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  // Use type assertion to handle React version conflicts
  return render(ui as any, {
    wrapper: AllTheProviders,
    ...options,
  });
};

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };

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

/**
 * Test context helpers
 */
export const TestContext = {
  theme: mockTheme,
  render: customRender,
  createMockEmotionMetrics,
};

/**
 * Helper to create a mock event
 */
export function createMockEvent(
  eventName: string,
  element: Element,
  data: Record<string, unknown> = {}
): Event {
  const event = new Event(eventName, { bubbles: true });
  Object.assign(event, data);
  return event;
}

/**
 * Helper to wait for a condition
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  let timeoutId: number;
  let isResolved = false;

  const cleanup = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  };

  const sleep = () =>
    new Promise<void>((resolve) => {
      timeoutId = window.setTimeout(() => {
        if (!isResolved) {
          resolve();
        }
      }, interval);
    });

  try {
    while (Date.now() - start < timeout) {
      const result = await condition();
      if (result) {
        isResolved = true;
        return;
      }
      await sleep();
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  } finally {
    cleanup();
  }
}
