import React from "react";
interface FocusState {
    activeId: string | null;
    history: string[];
}
interface AccessibilityContextType {
    focusState: FocusState;
    setFocus: (id: string) => void;
    returnFocus: () => void;
    registerFocusable: (id: string, ref: React.RefObject<HTMLElement>) => () => void;
    announce: (message: string, priority?: "polite" | "assertive") => void;
    registerKeyboardShortcut: (key: string, callback: (event: KeyboardEvent) => void, options?: {
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
    }) => () => void;
    setLiveRegion: (id: string, content: string, priority?: "polite" | "assertive") => void;
    preferences: {
        reduceMotion: boolean;
        highContrast: boolean;
        largeText: boolean;
    };
    updatePreference: (key: keyof AccessibilityContextType["preferences"], value: boolean) => void;
}
interface AccessibilityProviderProps {
    children: React.ReactNode;
}
export declare const AccessibilityProvider: React.FC<AccessibilityProviderProps>;
export declare const useAccessibility: () => AccessibilityContextType;
export {};
