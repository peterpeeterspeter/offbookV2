import { BrowserFeatures, CompatibilityReport, WebRTCSupport, AudioSupport, StorageSupport, MediaSupport, PerformanceSupport } from '@/types/mobile'
import { checkWebGLSupport } from '@/utils/browser-compatibility'

export class BrowserCompatibilityTester {
  public async test(): Promise<CompatibilityReport> {
    const features = await this.detectFeatures()
    const issues = this.analyzeIssues(features)
    const recommendations = this.generateRecommendations(features, issues)

    return {
      browser: this.detectBrowser(),
      features,
      issues,
      recommendations
    }
  }

  public async detectFeatures(): Promise<BrowserFeatures> {
    return {
      webrtc: await this.checkWebRTCSupport(),
      audio: await this.checkAudioSupport(),
      graphics: await this.checkGraphicsSupport(),
      storage: await this.checkStorageSupport(),
      media: await this.checkMediaFeatures(),
      performance: this.checkPerformanceSupport(),
      input: this.checkInputSupport(),
      sensors: await this.checkSensorSupport(),
      apis: await this.checkAPISupport()
    }
  }

  public async checkWebRTCSupport(): Promise<WebRTCSupport> {
    return {
      getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      peerConnection: 'RTCPeerConnection' in window,
      dataChannel: 'RTCDataChannel' in window,
      screenSharing: 'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices
    }
  }

  private checkCodecSupport(mimeType: string): boolean {
    try {
      return MediaRecorder.isTypeSupported(mimeType)
    } catch {
      return false
    }
  }

  public async checkAudioSupport(): Promise<AudioSupport> {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const hasAudioContext = !!AudioContext
    const sampleRate = hasAudioContext ? new AudioContext().sampleRate : 0
    const channelCount = hasAudioContext ? 2 : 0

    return {
      webAudio: hasAudioContext,
      mediaRecorder: 'MediaRecorder' in window,
      audioWorklet: hasAudioContext && 'audioWorklet' in AudioContext.prototype,
      mediaDevices: 'mediaDevices' in navigator,
      sampleRate,
      channelCount,
      audioCodecs: ['audio/webm', 'audio/mp4', 'audio/mpeg'],
      codecSupport: {
        opus: this.checkCodecSupport('audio/webm;codecs=opus'),
        aac: this.checkCodecSupport('audio/mp4;codecs=mp4a.40.2'),
        mp3: this.checkCodecSupport('audio/mpeg'),
        webm: this.checkCodecSupport('audio/webm')
      }
    }
  }

  public async checkGraphicsSupport(): Promise<BrowserFeatures['graphics']> {
    return checkWebGLSupport();
  }

  public async checkStorageSupport(): Promise<StorageSupport> {
    return {
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,
      indexedDB: 'indexedDB' in window,
      webSQL: 'openDatabase' in window,
      quota: await this.getStorageQuota()
    }
  }

  public async checkMediaFeatures(): Promise<MediaSupport> {
    return {
      videoCodecs: await this.getSupportedVideoCodecs(),
      imageFormats: await this.getSupportedImageFormats(),
      mediaCapabilities: 'mediaCapabilities' in navigator,
      mediaQueries: this.checkMediaQueries(),
      pictureInPicture: 'pictureInPictureEnabled' in document,
      mediaSession: 'mediaSession' in navigator
    }
  }

  private checkPerformanceSupport(): PerformanceSupport {
    return {
      performanceObserver: 'PerformanceObserver' in window,
      resourceTiming: 'performance' in window && !!performance.getEntriesByType,
      userTiming: 'performance' in window && !!performance.mark,
      navigationTiming: 'performance' in window && !!performance.timing
    }
  }

  private checkInputSupport(): BrowserFeatures['input'] {
    return {
      touchEvents: 'ontouchstart' in window,
      pointerEvents: 'PointerEvent' in window,
      multiTouch: 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 1,
      forceTouch: 'ontouchforcechange' in window
    }
  }

  private async checkSensorSupport(): Promise<BrowserFeatures['sensors']> {
    return {
      accelerometer: 'Accelerometer' in window,
      gyroscope: 'Gyroscope' in window,
      magnetometer: 'Magnetometer' in window,
      ambientLight: 'AmbientLightSensor' in window
    }
  }

  private async checkAPISupport(): Promise<BrowserFeatures['apis']> {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      webWorker: 'Worker' in window,
      webSocket: 'WebSocket' in window,
      webAssembly: 'WebAssembly' in window
    }
  }

  private detectBrowser(): CompatibilityReport['browser'] {
    const ua = navigator.userAgent.toLowerCase()
    let name = 'unknown'
    let version = 'unknown'
    let engine = 'unknown'

    if (ua.includes('firefox')) {
      name = 'Firefox'
      engine = 'Gecko'
    } else if (ua.includes('edg')) {
      name = 'Edge'
      engine = 'Chromium'
    } else if (ua.includes('chrome')) {
      name = 'Chrome'
      engine = 'Chromium'
    } else if (ua.includes('safari')) {
      name = 'Safari'
      engine = 'WebKit'
    }

    const match = ua.match(new RegExp(`${name.toLowerCase()}\\/(\\d+(\\.\\d+)?)`))?.[1]
    if (match) {
      version = match
    }

    return { name, version, engine }
  }

  private async getStorageQuota(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota = 0 } = await navigator.storage.estimate()
      return quota
    }
    return 0
  }

  private async getSupportedVideoCodecs(): Promise<string[]> {
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const video = document.createElement('video');
    return videoTypes.filter(type => video.canPlayType(type) !== '');
  }

  private async getSupportedImageFormats(): Promise<string[]> {
    const formats = ['image/webp', 'image/avif', 'image/jpeg', 'image/png', 'image/gif']
    const img = document.createElement('img')

    return formats.filter(format => {
      try {
        img.src = `data:${format};base64,`;
        return img.complete;
      } catch {
        return false;
      }
    })
  }

  private checkMediaQueries(): Record<string, boolean> {
    return {
      dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      light: window.matchMedia('(prefers-color-scheme: light)').matches,
      reducedMotion: window.matchMedia('(prefers-reduced-motion)').matches,
      highContrast: window.matchMedia('(forced-colors: active)').matches,
      portrait: window.matchMedia('(orientation: portrait)').matches,
      landscape: window.matchMedia('(orientation: landscape)').matches
    }
  }

  private analyzeIssues(features: BrowserFeatures): CompatibilityReport['issues'] {
    const issues: CompatibilityReport['issues'] = []

    if (!features.webrtc.getUserMedia) {
      issues.push({
        feature: 'WebRTC',
        description: 'Camera and microphone access not supported',
        severity: 'high'
      })
    }

    if (!features.audio.webAudio) {
      issues.push({
        feature: 'Web Audio',
        description: 'Advanced audio processing not supported',
        severity: 'medium'
      })
    }

    if (!features.graphics.webgl) {
      issues.push({
        feature: 'WebGL',
        description: '3D graphics not supported',
        severity: 'high'
      })
    }

    if (!features.storage.indexedDB) {
      issues.push({
        feature: 'IndexedDB',
        description: 'Offline data storage not supported',
        severity: 'high'
      })
    }

    if (!features.performance.performanceObserver) {
      issues.push({
        feature: 'Performance Observer',
        description: 'Performance monitoring not supported',
        severity: 'medium'
      })
    }

    return issues
  }

  private generateRecommendations(features: BrowserFeatures, issues: CompatibilityReport['issues']): string[] {
    const recommendations: string[] = []

    if (issues.length > 0) {
      recommendations.push('Consider using a modern browser with better feature support.')
    }

    if (!features.webrtc.getUserMedia) {
      recommendations.push('Enable camera and microphone permissions in your browser settings.')
    }

    if (!features.storage.indexedDB) {
      recommendations.push('Enable storage permissions in your browser settings.')
    }

    return recommendations
  }
}
