import { CompatibilityReport } from '@/types/mobile';
export declare class BrowserCompatibilityTester {
    test(): Promise<CompatibilityReport>;
    private detectFeatures;
    private checkWebRTCSupport;
    private checkAudioSupport;
    private checkGraphicsSupport;
    private checkStorageSupport;
    private checkMediaSupport;
    private checkPerformanceSupport;
    private checkInputSupport;
    private checkSensorSupport;
    private checkAPISupport;
    private detectBrowser;
    private getStorageQuota;
    private getSupportedAudioCodecs;
    private getSupportedVideoCodecs;
    private getSupportedImageFormats;
    private checkMediaQueries;
    private analyzeIssues;
    private generateRecommendations;
}
