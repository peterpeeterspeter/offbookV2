import { BrowserFeatures, CompatibilityReport } from '@/types/mobile';
export declare class BrowserCompatibilityTester {
    test(): Promise<CompatibilityReport>;
    detectFeatures(): Promise<BrowserFeatures>;
    checkWebRTCSupport(): Promise<BrowserFeatures['webRTC']>;
    checkAudioSupport(): Promise<BrowserFeatures['audio']>;
    checkGraphicsSupport(): Promise<BrowserFeatures['graphics']>;
    checkStorageSupport(): Promise<BrowserFeatures['storage']>;
    checkMediaFeatures(): Promise<BrowserFeatures['media']>;
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
    generateCompatibilityReport(): Promise<CompatibilityReport>;
    checkWebAudioSupport(): Promise<{
        audioContext: boolean;
        audioWorklet: boolean;
        mediaSession: boolean;
    }>;
    checkAudioWorkletSupport(): Promise<{
        registration: boolean;
        moduleLoading: boolean;
    }>;
    checkAudioBufferSupport(): Promise<{
        processing: boolean;
        transferable: boolean;
    }>;
    checkInterruptionHandling(): Promise<{
        resumeOnFocus: boolean;
        handleBackgroundState: boolean;
    }>;
    checkCodecSupport(): Promise<{
        webm: boolean;
        mp4: boolean;
        ogg: boolean;
    }>;
    getFallbackCodec(): Promise<string>;
    validateCodec(codec: string): Promise<boolean>;
    checkStorageQuota(): Promise<{
        available: number;
        granted: number;
        persistent: boolean;
    }>;
    getFallbackStorage(): Promise<{
        type: 'localStorage' | 'indexedDB' | 'memory';
        available: number;
    }>;
    simulateBrowserCrash(): Promise<{
        stateRecovered: boolean;
        dataLoss: boolean;
    }>;
    simulateMemoryPressure(): Promise<{
        resourcesFreed: boolean;
        performanceMaintained: boolean;
    }>;
    simulateDeviceChange(): Promise<{
        deviceReconnected: boolean;
        streamsContinued: boolean;
    }>;
}
