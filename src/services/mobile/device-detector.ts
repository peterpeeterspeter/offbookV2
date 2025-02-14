import { DeviceInfo } from '@/types/mobile'

export class DeviceDetector {
  private userAgent: string
  private screenWidth: number = 0
  private screenHeight: number = 0

  constructor() {
    // Handle SSR case where window/navigator might not be available
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
    this.updateScreenDimensions()
  }

  private updateScreenDimensions(): void {
    if (typeof window !== 'undefined') {
      this.screenWidth = window.innerWidth
      this.screenHeight = window.innerHeight
    } else {
      this.screenWidth = 0
      this.screenHeight = 0
    }
  }

  public getDeviceInfo(): DeviceInfo {
    this.updateScreenDimensions() // Ensure dimensions are current
    return {
      os: this.detectOS(),
      type: this.detectDeviceType(),
      screen: {
        width: this.screenWidth,
        height: this.screenHeight,
        orientation: this.detectOrientation(),
        dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      },
      capabilities: this.detectCapabilities(),
      browser: this.detectBrowser()
    }
  }

  private detectOS(): DeviceInfo['os'] {
    if (this.userAgent.includes('iphone') || this.userAgent.includes('ipad') || this.userAgent.includes('ipod')) {
      return 'iOS'
    }
    if (this.userAgent.includes('android')) {
      return 'Android'
    }
    return 'other'
  }

  private detectDeviceType(): DeviceInfo['type'] {
    // Check for tablets first
    if (this.userAgent.includes('ipad') ||
        (this.userAgent.includes('android') && !this.userAgent.includes('mobile'))) {
      return 'tablet'
    }
    // Then check for mobile devices
    if (this.userAgent.includes('iphone') ||
        this.userAgent.includes('ipod') ||
        (this.userAgent.includes('android') && this.userAgent.includes('mobile')) ||
        this.userAgent.includes('mobile')) {
      return 'mobile'
    }
    return 'desktop'
  }

  private detectOrientation(): 'portrait' | 'landscape' {
    if (typeof window === 'undefined') return 'portrait'
    this.updateScreenDimensions()
    return this.screenWidth < this.screenHeight ? 'portrait' : 'landscape'
  }

  private detectCapabilities(): DeviceInfo['capabilities'] {
    if (typeof window === 'undefined') {
      return {
        touchScreen: false,
        accelerometer: false,
        gyroscope: false,
        vibration: false,
        webGL: false
      }
    }

    return {
      touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      accelerometer: typeof DeviceMotionEvent !== 'undefined',
      gyroscope: typeof DeviceOrientationEvent !== 'undefined',
      vibration: 'vibrate' in navigator,
      webGL: this.detectWebGLSupport()
    }
  }

  private detectWebGLSupport(): boolean {
    if (typeof window === 'undefined') return false
    try {
      const canvas = document.createElement('canvas')
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
    } catch (e) {
      return false
    }
  }

  private detectBrowser(): DeviceInfo['browser'] {
    const ua = this.userAgent
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

  public onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', () => {
      this.updateScreenDimensions()
      callback(this.detectOrientation())
    })
  }
}
