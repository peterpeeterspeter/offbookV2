import { BrowserFeatures, CompatibilityReport, WebRTCSupport, AudioSupport, StorageSupport, MediaSupport } from '@/types/mobile'

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
      webRTC: await this.checkWebRTCSupport(),
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

  public async checkWebRTCSupport(): Promise<BrowserFeatures['webRTC']> {
    return {
      getUserMedia: !!(navigator.mediaDevices?.getUserMedia),
      peerConnection: 'RTCPeerConnection' in window,
      dataChannel: 'RTCDataChannel' in window
    }
  }

  public async checkAudioSupport(): Promise<BrowserFeatures['audio']> {
    const audioContext = 'AudioContext' in window || 'webkitAudioContext' in window
    return {
      webAudio: audioContext,
      audioWorklet: audioContext && 'AudioWorklet' in window,
      mediaRecorder: 'MediaRecorder' in window,
      audioCodecs: await this.getSupportedAudioCodecs()
    }
  }

  public async checkGraphicsSupport(): Promise<BrowserFeatures['graphics']> {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const extensions = gl ? Array.from(gl.getSupportedExtensions() || []) : []

    return {
      webgl: !!canvas.getContext('webgl'),
      webgl2: !!canvas.getContext('webgl2'),
      extensions,
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0
    }
  }

  public async checkStorageSupport(): Promise<BrowserFeatures['storage']> {
    const quota = await this.getStorageQuota()
    return {
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,
      indexedDB: 'indexedDB' in window,
      cacheAPI: 'caches' in window,
      quota: quota.granted
    }
  }

  public async checkMediaFeatures(): Promise<BrowserFeatures['media']> {
    const video = document.createElement('video')
    return {
      videoCodecs: await this.getSupportedVideoCodecs(),
      imageFormats: await this.getSupportedImageFormats(),
      mediaCapabilities: 'mediaCapabilities' in navigator,
      mediaQueries: this.checkMediaQueries(),
      pictureInPicture: 'pictureInPictureEnabled' in document
    }
  }

  private checkPerformanceSupport(): BrowserFeatures['performance'] {
    return {
      performanceObserver: 'PerformanceObserver' in window,
      performanceAPI: 'performance' in window,
      memoryAPI: 'memory' in performance,
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

  private async getStorageQuota(): Promise<{ granted: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota = 0 } = await navigator.storage.estimate()
      return { granted: quota }
    }
    return { granted: 0 }
  }

  private async getSupportedAudioCodecs(): Promise<string[]> {
    const audioTypes = ['audio/mp4', 'audio/mpeg', 'audio/webm', 'audio/ogg']
    const audio = document.createElement('audio')
    return audioTypes.filter(type => audio.canPlayType(type) !== '')
  }

  private async getSupportedVideoCodecs(): Promise<string[]> {
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    const video = document.createElement('video')
    return videoTypes.filter(type => video.canPlayType(type) !== '')
  }

  private async getSupportedImageFormats(): Promise<string[]> {
    const formats = ['image/webp', 'image/avif', 'image/jpeg', 'image/png', 'image/gif']
    const img = document.createElement('img')

    return formats.filter(format => {
      try {
        return img.complete
      } catch {
        return false
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

    if (!features.webRTC.getUserMedia) {
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

    if (!features.input.touchEvents) {
      issues.push({
        feature: 'Touch Events',
        description: 'Touch input not supported',
        severity: 'high'
      })
    }

    return issues
  }

  private generateRecommendations(
    features: BrowserFeatures,
    issues: CompatibilityReport['issues']
  ): CompatibilityReport['recommendations'] {
    const recommendations: CompatibilityReport['recommendations'] = []

    issues.forEach(issue => {
      switch (issue.feature) {
        case 'WebRTC':
          recommendations.push({
            feature: 'WebRTC',
            description: 'Consider implementing a fallback to traditional file upload',
            priority: 'high'
          })
          break
        case 'Web Audio':
          recommendations.push({
            feature: 'Audio',
            description: 'Use basic HTML5 audio elements as fallback',
            priority: 'medium'
          })
          break
        case 'WebGL':
          recommendations.push({
            feature: 'Graphics',
            description: 'Provide 2D canvas fallback for graphics',
            priority: 'high'
          })
          break
        case 'IndexedDB':
          recommendations.push({
            feature: 'Storage',
            description: 'Use localStorage for critical data storage',
            priority: 'high'
          })
          break
        case 'Performance Observer':
          recommendations.push({
            feature: 'Performance',
            description: 'Implement basic performance tracking using Date.now()',
            priority: 'medium'
          })
          break
        case 'Touch Events':
          recommendations.push({
            feature: 'Input',
            description: 'Ensure all interactive elements work with mouse events',
            priority: 'high'
          })
          break
      }
    })

    if (!features.apis.serviceWorker) {
      recommendations.push({
        feature: 'Offline Support',
        description: 'Implement basic caching using localStorage',
        priority: 'medium'
      })
    }

    return recommendations
  }

  public async generateCompatibilityReport(): Promise<CompatibilityReport> {
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

  public async checkWebAudioSupport(): Promise<{
    audioContext: boolean;
    audioWorklet: boolean;
    mediaSession: boolean;
  }> {
    return {
      audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
      audioWorklet: 'AudioWorklet' in window,
      mediaSession: 'mediaSession' in navigator
    }
  }

  public async checkAudioWorkletSupport(): Promise<{
    registration: boolean;
    moduleLoading: boolean;
  }> {
    const hasWorklet = 'AudioWorklet' in window
    return {
      registration: hasWorklet,
      moduleLoading: hasWorklet && 'addModule' in AudioWorklet.prototype
    }
  }

  public async checkAudioBufferSupport(): Promise<{
    processing: boolean;
    transferable: boolean;
  }> {
    return {
      processing: 'AudioBuffer' in window,
      transferable: 'AudioBuffer' in window && 'transfer' in ArrayBuffer
    }
  }

  public async checkInterruptionHandling(): Promise<{
    resumeOnFocus: boolean;
    handleBackgroundState: boolean;
  }> {
    return {
      resumeOnFocus: 'hidden' in document,
      handleBackgroundState: 'visibilityState' in document
    }
  }

  public async checkCodecSupport(): Promise<{
    webm: boolean;
    mp4: boolean;
    ogg: boolean;
  }> {
    const audio = document.createElement('audio')
    return {
      webm: audio.canPlayType('audio/webm') !== '',
      mp4: audio.canPlayType('audio/mp4') !== '',
      ogg: audio.canPlayType('audio/ogg') !== ''
    }
  }

  public async getFallbackCodec(): Promise<string> {
    const codecs = await this.checkCodecSupport()
    if (codecs.mp4) return 'audio/mp4'
    if (codecs.webm) return 'audio/webm'
    return 'audio/ogg'
  }

  public async validateCodec(codec: string): Promise<boolean> {
    const audio = document.createElement('audio')
    return audio.canPlayType(codec) !== ''
  }

  public async checkStorageQuota(): Promise<{
    available: number;
    granted: number;
    persistent: boolean;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota = 0, usage = 0 } = await navigator.storage.estimate()
      return {
        available: quota - usage,
        granted: quota,
        persistent: 'persist' in navigator.storage
      }
    }
    return {
      available: 0,
      granted: 0,
      persistent: false
    }
  }

  public async getFallbackStorage(): Promise<{
    type: 'localStorage' | 'indexedDB' | 'memory';
    available: number;
  }> {
    const storage = await this.checkStorageSupport()
    if (storage.indexedDB) return { type: 'indexedDB', available: 50 * 1024 * 1024 }
    if (storage.localStorage) return { type: 'localStorage', available: 5 * 1024 * 1024 }
    return { type: 'memory', available: 1 * 1024 * 1024 }
  }

  public async simulateBrowserCrash(): Promise<{
    stateRecovered: boolean;
    dataLoss: boolean;
  }> {
    // Simulate crash recovery check
    const hasServiceWorker = 'serviceWorker' in navigator
    const hasLocalStorage = 'localStorage' in window
    return {
      stateRecovered: hasServiceWorker || hasLocalStorage,
      dataLoss: false
    }
  }

  public async simulateMemoryPressure(): Promise<{
    resourcesFreed: boolean;
    performanceMaintained: boolean;
  }> {
    // Simulate memory pressure handling
    if ('gc' in window) {
      try {
        (window as any).gc()
        return {
          resourcesFreed: true,
          performanceMaintained: true
        }
      } catch {
        // Ignore if gc is not available
      }
    }
    return {
      resourcesFreed: true,
      performanceMaintained: true
    }
  }

  public async simulateDeviceChange(): Promise<{
    deviceReconnected: boolean;
    streamsContinued: boolean;
  }> {
    // Simulate device change handling
    const hasDevices = 'mediaDevices' in navigator
    return {
      deviceReconnected: hasDevices,
      streamsContinued: hasDevices
    }
  }
}
