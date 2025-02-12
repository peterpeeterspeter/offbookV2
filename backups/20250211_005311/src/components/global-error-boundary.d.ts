import { Component, type ReactNode } from "react";
interface Props {
    children: ReactNode;
}
interface State {
    error: Error | null;
}
export declare class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    render(): string | number | bigint | boolean | Iterable<ReactNode> | Promise<import("react").AwaitedReactNode> | import("react").JSX.Element | null | undefined;
}
export {};
