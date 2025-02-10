import React, { Component, ErrorInfo } from "react";
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}
interface Props {
    children: React.ReactNode;
    onReset?: () => void;
}
interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
/**
 * Error boundary component for handling audio-related errors
 */
export declare class AudioErrorBoundary extends Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    /**
     * Get user-friendly error message based on error type
     */
    private getErrorMessage;
    /**
     * Get recovery hint based on error type
     */
    private getRecoveryHint;
    /**
     * Get recovery actions based on error type
     */
    private getRecoveryActions;
    /**
     * Handle reset action
     */
    private handleReset;
    render(): React.ReactNode;
}
export {};
