import { type ComponentType, type ReactElement } from "react";
interface CustomRenderOptions {
    wrapper?: ComponentType<any>;
}
export declare function renderWithWrapper(ui: ReactElement, { wrapper: Wrapper, ...options }?: CustomRenderOptions): {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (baseElement?: Element | DocumentFragment | Array<Element | DocumentFragment>, maxLength?: number, options?: import("pretty-format").OptionsReceived) => void;
    rerender: (ui: React.ReactNode) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
    getByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
    findByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
    getAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    queryByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
    queryAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    findByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
    findByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
    getAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    queryByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
    queryAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    findByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
    getAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    queryByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    findByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
    getAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    queryByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
    queryAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    findByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement;
    getAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
    queryByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement | null;
    queryAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
    findByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    getByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
    getAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    queryByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
    findByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
    findAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
};
export * from "@testing-library/react";
