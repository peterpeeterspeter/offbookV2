interface UseKeyboardNavigationOptions {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onEnter?: () => void;
    onEscape?: () => void;
    onSpace?: () => void;
    onTab?: () => void;
    onShiftTab?: () => void;
}
export declare const useKeyboardNavigation: (options: UseKeyboardNavigationOptions) => void;
interface UseFocusTrapOptions {
    enabled?: boolean;
    onEscape?: () => void;
}
export declare const useFocusTrap: (options?: UseFocusTrapOptions) => import("react").RefObject<HTMLElement>;
interface UseAnnouncementOptions {
    message: string;
    priority?: 'polite' | 'assertive';
    delay?: number;
}
export declare const useAnnouncement: (options: UseAnnouncementOptions) => void;
interface UseLiveRegionOptions {
    id: string;
    initialContent?: string;
    priority?: 'polite' | 'assertive';
}
export declare const useLiveRegion: (options: UseLiveRegionOptions) => (content: string) => void;
export declare const usePreferredReducedMotion: () => boolean;
export declare const usePreferredHighContrast: () => boolean;
export declare const usePreferredLargeText: () => boolean;
export {};
