import { DeviceInfo } from '@/types/mobile';
export declare class DeviceDetector {
    private userAgent;
    private screenWidth;
    private screenHeight;
    constructor();
    getDeviceInfo(): DeviceInfo;
    private detectOS;
    private detectDeviceType;
    private detectOrientation;
    private detectCapabilities;
    private detectWebGLSupport;
    private detectBrowser;
    onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void;
}
