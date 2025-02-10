export interface DeviceInfo {
    os: 'iOS' | 'Android' | 'other';
    type: 'mobile' | 'tablet' | 'desktop';
    screen: {
        width: number;
        height: number;
        orientation: 'portrait' | 'landscape';
        dpr: number;
    };
    capabilities: {
        touchScreen: boolean;
        accelerometer: boolean;
        gyroscope: boolean;
        vibration: boolean;
        webGL: boolean;
    };
    browser: {
        name: string;
        version: string;
        engine: string;
    };
}
export interface AccessibilityReport {
    ariaLabels: {
        missing: string[];
        valid: number;
    };
    contrastIssues: Array<{
        element: string;
        ratio: number;
        required: number;
    }>;
    validElements: string[];
    smallTargets: string[];
    validTargets: string[];
    focusableElements: string[];
    focusOrder: string[];
    missingAltText: string[];
    validAlternativeText: string[];
    gestureHandlers: {
        tap: boolean;
        swipe: boolean;
        pinch: boolean;
    };
    ariaLiveRegions: string[];
    updateAnnouncements: string[];
    orientationLock: boolean;
    responsiveLayout: boolean;
}
export interface PerformanceProfile {
    device: DeviceInfo;
    performance: {
        fps: number;
        memory: {
            heapUsed: number;
            heapTotal: number;
            external: number;
        };
        network: {
            bandwidth: number;
            latency: number;
            type: string;
        };
        battery: {
            level: number;
            charging: boolean;
            temperature: number;
        };
    };
    resources: ResourceMetrics[];
    metrics: {
        ttfb: number;
        fcp: number;
        lcp: number;
        fid: number;
        tti: number;
        tbt: number;
    };
}
export interface ResourceMetrics {
    type: 'script' | 'style' | 'image' | 'font' | 'other';
    url: string;
    loadTime: number;
    size: number;
    cached: boolean;
    priority: string;
}
export interface BrowserFeatures {
    webrtc: {
        getUserMedia: boolean;
        peerConnection: boolean;
        dataChannel: boolean;
        screenSharing: boolean;
    };
    audio: {
        webAudio: boolean;
        audioWorklet: boolean;
        mediaRecorder: boolean;
        audioCodecs: string[];
    };
    graphics: {
        webgl: boolean;
        webgl2: boolean;
        extensions: string[];
        maxTextureSize: number;
    };
    storage: {
        localStorage: boolean;
        sessionStorage: boolean;
        indexedDB: boolean;
        webSQL: boolean;
        quota: number;
    };
    media: {
        videoCodecs: string[];
        imageFormats: string[];
        mediaQueries: Record<string, boolean>;
        pictureInPicture: boolean;
    };
    performance: {
        performanceObserver: boolean;
        resourceTiming: boolean;
        userTiming: boolean;
        navigationTiming: boolean;
    };
    input: {
        touchEvents: boolean;
        pointerEvents: boolean;
        multiTouch: boolean;
        forceTouch: boolean;
    };
    sensors: {
        accelerometer: boolean;
        gyroscope: boolean;
        magnetometer: boolean;
        ambientLight: boolean;
    };
    apis: {
        serviceWorker: boolean;
        webWorker: boolean;
        webSocket: boolean;
        webAssembly: boolean;
    };
}
export interface CompatibilityReport {
    browser: {
        name: string;
        version: string;
        engine: string;
    };
    features: BrowserFeatures;
    issues: Array<{
        feature: string;
        description: string;
        severity: 'high' | 'medium' | 'low';
    }>;
    recommendations: Array<{
        feature: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}
