import { render as rtlRender } from "@testing-library/react";
import { type ComponentType, type ReactElement } from "react";

// Custom render function that handles React component types correctly
interface CustomRenderOptions {
  wrapper?: ComponentType<any>;
}

export function renderWithWrapper(
  ui: ReactElement,
  { wrapper: Wrapper, ...options }: CustomRenderOptions = {}
) {
  function Wrap({ children }: { children: ReactElement }) {
    return Wrapper ? <Wrapper>{children}</Wrapper> : children;
  }

  return {
    ...rtlRender(ui, { wrapper: Wrap, ...options }),
  };
}

// Re-export everything
export * from "@testing-library/react";
