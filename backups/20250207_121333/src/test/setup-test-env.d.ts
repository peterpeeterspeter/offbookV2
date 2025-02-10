import '@testing-library/jest-dom';
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
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
    namespace React {
        interface FunctionComponent<P = {}> {
            (props: P, context?: any): ReactElement<any, any> | null;
        }
    }
}
