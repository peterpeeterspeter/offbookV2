import { Component, type ErrorInfo } from "react";
import { type AudioServiceStateType, type AudioErrorDetails } from "@/types/audio";
interface Props {
    children: React.ReactNode;
    onRetry?: () => void;
    onError?: (error: Error) => void;
}
interface State {
    error: Error | null;
    errorInfo: ErrorInfo | null;
    audioState: {
        error: AudioErrorDetails | null;
        state: AudioServiceStateType;
    };
}
export declare class AudioErrorBoundary extends Component<Props, State> {
    private stateManager;
    constructor(props: Props);
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    private getErrorMessage;
    private getRecoveryHint;
    private getRecoveryActions;
    private handleRetry;
    render(): React.ReactNode;
}
export {};
