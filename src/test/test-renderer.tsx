import React from "react";
import { render as rtlRender } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";

interface WrapperProps {
  children: React.ReactNode;
}

function TestWrapper({ children }: WrapperProps) {
  return <>{children}</>;
}

type CustomRenderOptions = Omit<RenderOptions, "wrapper"> & {
  wrapper?: React.ComponentType<WrapperProps>;
};

function customRender(
  ui: React.ReactElement,
  { wrapper: Wrapper = TestWrapper, ...options }: CustomRenderOptions = {}
): RenderResult {
  // @ts-expect-error - Known type issue with @testing-library/react render function
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

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
