import React from "react";
import { RenderOptions, RenderResult } from "@testing-library/react";
declare const customRender: (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) => RenderResult;
export * from "@testing-library/react";
export { customRender as render };
export declare function assertIsReactComponent<T>(component: React.ComponentType<T>): asserts component is React.ComponentType<T>;
