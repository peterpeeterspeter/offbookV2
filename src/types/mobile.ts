export interface DeviceInfo {
  os: 'iOS' | 'Android' | 'other'
  type: 'mobile' | 'tablet' | 'desktop'
  screen: {
    width: number
    height: number
    orientation: 'portrait' | 'landscape'
    dpr: number
  }
  capabilities: {
    touchScreen: boolean
    accelerometer: boolean
    gyroscope: boolean
    vibration: boolean
    webGL: boolean
  }
  browser: {
    name: string
    version: string
    engine: string
  }
}

export interface AccessibilityReport {
  ariaLabels: {
    missing: string[]
    valid: number
  }
  contrastIssues: Array<{
    element: string
    ratio: number
    required: number
  }>
  validElements: string[]
  smallTargets: string[]
  validTargets: string[]
  focusableElements: string[]
  focusOrder: string[]
  missingAltText: string[]
  validAlternativeText: string[]
  gestureHandlers: {
    tap: boolean
    swipe: boolean
    pinch: boolean
  }
  ariaLiveRegions: string[]
  updateAnnouncements: string[]
  orientationLock: boolean
  responsiveLayout: boolean
}

export interface PerformanceProfile {
  device: DeviceInfo
  performance: {
    fps: number
    memory: {
      heapUsed: number
      heapTotal: number
      external: number
    }
    network: {
      bandwidth: number
      latency: number
      type: string
    }
    battery: {
      level: number
      charging: boolean
      temperature: number
    }
  }
  resources: ResourceMetrics[]
  metrics: {
    ttfb: number
    fcp: number
    lcp: number
    fid: number
    tti: number
    tbt: number
  }
}

export interface ResourceMetrics {
  type: 'script' | 'style' | 'image' | 'font' | 'other'
  url: string
  loadTime: number
  size: number
  cached: boolean
  priority: string
}

export interface WebRTCSupport {
  getUserMedia: boolean
  peerConnection: boolean
  dataChannel: boolean
  screenSharing: boolean
}

export interface AudioSupport {
  webAudio: boolean
  mediaRecorder: boolean
  audioWorklet: boolean
  mediaDevices: boolean
  sampleRate: number
  channelCount: number
  audioCodecs: string[]
  codecSupport: {
    opus: boolean
    aac: boolean
    mp3: boolean
    webm: boolean
  }
}

export interface GraphicsSupport {
  webgl: boolean
  webgl2: boolean
  extensions: string[]
  maxTextureSize: number
}

export interface StorageSupport {
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  webSQL: boolean
  quota: number
}

export interface MediaSupport {
  videoCodecs: string[]
  imageFormats: string[]
  mediaCapabilities: boolean
  mediaQueries: Record<string, boolean>
  pictureInPicture: boolean
  mediaSession: boolean
}

export interface PerformanceSupport {
  performanceObserver: boolean
  resourceTiming: boolean
  userTiming: boolean
  navigationTiming: boolean
}

export interface InputSupport {
  touchEvents: boolean
  pointerEvents: boolean
  multiTouch: boolean
  forceTouch: boolean
}

export interface SensorSupport {
  accelerometer: boolean
  gyroscope: boolean
  magnetometer: boolean
  ambientLight: boolean
}

export interface WebAPISupport {
  serviceWorker: boolean
  webWorker: boolean
  webSocket: boolean
  webAssembly: boolean
}

export interface BrowserFeatures {
  webrtc: WebRTCSupport
  audio: AudioSupport
  graphics: GraphicsSupport
  storage: StorageSupport
  media: MediaSupport
  performance: PerformanceSupport
  input: InputSupport
  sensors: SensorSupport
  apis: WebAPISupport
}

export interface BrowserConfig {
  name: string;
  userAgent: string;
  vendor: string;
  platform: string;
  hardwareConcurrency: number;
}

export interface CompatibilityReport {
  browser: {
    name: string
    version: string
    engine: string
  }
  features: BrowserFeatures
  issues: Array<{
    feature: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  recommendations: string[]
}

export interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}
