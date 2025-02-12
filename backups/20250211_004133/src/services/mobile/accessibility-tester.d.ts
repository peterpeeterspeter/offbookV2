import { AccessibilityReport } from '@/types/mobile';
export declare class AccessibilityTester {
    private root;
    constructor(root?: HTMLElement);
    test(): Promise<AccessibilityReport>;
    private checkAriaLabels;
    private checkColorContrast;
    private checkTouchTargets;
    private checkValidTargets;
    private checkFocusableElements;
    private checkFocusOrder;
    private checkAltText;
    private checkValidAltText;
    private checkGestureHandlers;
    private checkAriaLiveRegions;
    private checkUpdateAnnouncements;
    private checkOrientationLock;
    private checkResponsiveLayout;
    private getElementIdentifier;
    private calculateContrastRatio;
    private getBackgroundColor;
    private parseColor;
    private getRequiredContrastRatio;
    private checkValidElements;
}
