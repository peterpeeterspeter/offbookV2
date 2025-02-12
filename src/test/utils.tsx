import React from "react";
import {
  render as testingLibraryRender,
  RenderOptions,
  RenderResult,
} from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";

interface AllTheProviders {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProviders> = ({ children }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

const customRender = (
  ui: React.ReactNode,
  options: CustomRenderOptions = {}
): RenderResult => {
  return testingLibraryRender(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };
