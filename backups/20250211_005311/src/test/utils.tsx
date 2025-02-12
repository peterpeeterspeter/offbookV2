import { render as rtlRender, RenderResult } from "@testing-library/react";
import { type ComponentType, type ReactElement } from "react";

// Custom render function that handles React component types correctly
interface CustomRenderOptions {
  wrapper?: ComponentType<any>;
}

export function render(
  ui: ReactElement,
  { wrapper: Wrapper, ...options }: CustomRenderOptions = {}
): RenderResult {
  const wrapped = Wrapper ? <Wrapper>{ui}</Wrapper> : ui;
  return rtlRender(wrapped, options);
}

// Re-export everything
export * from "@testing-library/react";
export { render };
