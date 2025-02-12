import { RenderResult } from "@testing-library/react";
import { type ComponentType, type ReactElement } from "react";
interface CustomRenderOptions {
    wrapper?: ComponentType<any>;
}
export declare function render(ui: ReactElement, { wrapper: Wrapper, ...options }?: CustomRenderOptions): RenderResult;
export * from "@testing-library/react";
export { render };
