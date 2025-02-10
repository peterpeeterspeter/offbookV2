import { describe, it, expect, beforeEach } from 'vitest'
import { DeviceDetector } from '@/services/mobile/device-detector'
import type { DeviceInfo } from '@/types/mobile'

describe('DeviceDetector', () => {
  let detector: DeviceDetector

  beforeEach(() => {
    detector = new DeviceDetector()
  })

  it('should detect iOS devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    })

    const device = detector.detect()
    expect(device.os).toBe('iOS')
    expect(device.type).toBe('mobile')
    expect(device.capabilities.touchScreen).toBe(true)
  })

  it('should detect Android devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
      configurable: true
    })

    const device = detector.detect()
    expect(device.os).toBe('Android')
    expect(device.type).toBe('mobile')
    expect(device.capabilities.touchScreen).toBe(true)
  })

  it('should detect tablets', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      configurable: true
    })

    const device = detector.detect()
    expect(device.type).toBe('tablet')
    expect(device.capabilities.touchScreen).toBe(true)
  })

  it('should detect screen dimensions', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true })

    const device = detector.detect()
    expect(device.screen.width).toBe(375)
    expect(device.screen.height).toBe(812)
    expect(device.screen.orientation).toBe('portrait')
  })

  it('should detect device capabilities', () => {
    const device = detector.detect()
    expect(device.capabilities).toMatchObject({
      touchScreen: expect.any(Boolean),
      accelerometer: expect.any(Boolean),
      gyroscope: expect.any(Boolean),
      vibration: expect.any(Boolean),
      webGL: expect.any(Boolean)
    })
  })

  it('should handle orientation changes', () => {
    const orientationChanges: string[] = []
    detector.onOrientationChange((orientation) => {
      orientationChanges.push(orientation)
    })

    // Simulate orientation change
    Object.defineProperty(window, 'innerWidth', { value: 812, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })
    window.dispatchEvent(new Event('resize'))

    expect(orientationChanges).toContain('landscape')
  })
})
