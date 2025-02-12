import * as React from "react";
export interface Scene {
    id: string;
    number: number;
    duration: number;
    title?: string;
    description?: string;
}
interface SceneNavigationProps {
    scenes: Scene[];
    currentScene?: string;
    onSceneSelect: (sceneId: string) => void;
    disableAnimations?: boolean;
    testMode?: boolean;
}
export declare function SceneNavigation({ scenes, currentScene, onSceneSelect, disableAnimations, testMode, }: SceneNavigationProps): React.JSX.Element;
export declare namespace SceneNavigation {
    var displayName: string;
}
export {};
