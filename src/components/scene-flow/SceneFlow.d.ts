interface SceneFlowProps {
    scriptId: string;
    userRole: string;
    onComplete?: () => void;
    onError?: (error: string) => void;
}
export declare function SceneFlow({ scriptId, userRole, onComplete, onError, }: SceneFlowProps): import("react/jsx-runtime").JSX.Element;
export {};
