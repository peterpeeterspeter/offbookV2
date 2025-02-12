import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import {
  cleanup,
  render as rtlRender,
  RenderResult,
} from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React, { type ReactElement, type ComponentType } from "react";

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Fix for React 18 types in tests
declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {
      toBeInTheDocument(): void;
      toHaveAttribute(attr: string, value?: string): void;
      toHaveClass(className: string): void;
      toBeChecked(): void;
      toHaveStyle(style: Record<string, any>): void;
    }
  }
}

// Custom render function that handles React component types correctly
interface RenderOptions {
  wrapper?: ComponentType<any>;
}

export function render(
  ui: ReactElement,
  options: RenderOptions = {}
): RenderResult {
  const { wrapper: Wrapper } = options;

  const wrapped = Wrapper ? <Wrapper>{ui}</Wrapper> : ui;
  return rtlRender(wrapped);
}

// Re-export everything
export * from "@testing-library/react";
export { render };

// Helper function for creating test components (legacy support)
export function createTestComponent<P extends object>(
  Component: ComponentType<P>,
  props: P
): ReactElement {
  return React.createElement(Component, props);
}
