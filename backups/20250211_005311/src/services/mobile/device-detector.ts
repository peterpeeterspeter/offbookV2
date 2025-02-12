import { DeviceInfo } from '@/types/mobile'

export class DeviceDetector {
  private userAgent: string
  private screenWidth: number
  private screenHeight: number

  constructor() {
    this.userAgent = navigator.userAgent.toLowerCase()
    this.screenWidth = window.innerWidth
    this.screenHeight = window.innerHeight
  }

  public getDeviceInfo(): DeviceInfo {
    return {
      os: this.detectOS(),
      type: this.detectDeviceType(),
      screen: {
        width: this.screenWidth,
        height: this.screenHeight,
        orientation: this.detectOrientation(),
        dpr: window.devicePixelRatio || 1
      },
      capabilities: this.detectCapabilities(),
      browser: this.detectBrowser()
    }
  }

  private detectOS(): DeviceInfo['os'] {
    if (/iphone|ipad|ipod/.test(this.userAgent)) {
      return 'iOS'
    }
    if (/android/.test(this.userAgent)) {
      return 'Android'
    }
    return 'other'
  }

  private detectDeviceType(): DeviceInfo['type'] {
    if (/ipad|android(?!.*mobile)/.test(this.userAgent)) {
      return 'tablet'
    }
    if (/mobile|iphone|ipod|android/.test(this.userAgent)) {
      return 'mobile'
    }
    return 'desktop'
  }

  private detectOrientation(): 'portrait' | 'landscape' {
    return this.screenWidth < this.screenHeight ? 'portrait' : 'landscape'
  }

  private detectCapabilities(): DeviceInfo['capabilities'] {
    return {
      touchScreen: 'ontouchstart' in window,
      accelerometer: typeof DeviceMotionEvent !== 'undefined',
      gyroscope: typeof DeviceOrientationEvent !== 'undefined',
      vibration: 'vibrate' in navigator,
      webGL: this.detectWebGLSupport()
    }
  }

  private detectWebGLSupport(): boolean {
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
    window.addEventListener('resize', () => {
      this.screenWidth = window.innerWidth
      this.screenHeight = window.innerHeight
      callback(this.detectOrientation())
    })
  }
}
