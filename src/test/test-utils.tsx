import React from "react";
import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * This file contains test utilities with proper type definitions to handle
 * conflicts between different versions of @types/react in the project.
 */

// Mock toaster
jest.mock("@/components/ui/toaster", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
    resolvedTheme: "light",
  }),
}));

function render(ui: React.ReactElement, { ...renderOptions } = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
}

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { render };

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

// Helper function to wait for state updates
export const waitForStateUpdate = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper function to create a mock audio buffer
export function createMockAudioBuffer(
  duration: number = 1,
  sampleRate: number = 44100
) {
  const length = duration * sampleRate;
  const numberOfChannels = 1;
  const buffer = {
    length,
    duration,
    sampleRate,
    numberOfChannels,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(length)),
  };
  return buffer;
}

// Helper function to create a mock media stream
export function createMockMediaStream() {
  return {
    getTracks: () => [
      {
        stop: jest.fn(),
      },
    ],
  };
}

// Helper function to simulate browser environment
export function simulateBrowser(
  browser: "chrome" | "firefox" | "safari" | "mobile-safari"
) {
  const userAgents = {
    chrome:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    firefox:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    safari:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "mobile-safari":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  };

  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgents[browser],
    configurable: true,
  });
}

// Helper function to simulate performance metrics
export function simulatePerformanceMetrics(options: {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  connection?: { effectiveType: string; downlink: number; rtt: number };
}) {
  if (options.memory) {
    Object.defineProperty(window.performance, "memory", {
      value: options.memory,
      configurable: true,
    });
  }

  if (options.connection) {
    Object.defineProperty(window.navigator, "connection", {
      value: options.connection,
      configurable: true,
    });
  }
}

export { userEvent };
