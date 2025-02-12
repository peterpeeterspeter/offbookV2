import { DeviceInfo, PerformanceProfile, ResourceMetrics } from '@/types/mobile'
import { DeviceDetector } from './device-detector'

export class PerformanceProfiler {
  private deviceDetector: DeviceDetector
  private performanceObserver: PerformanceObserver | null = null
  private metrics: {
    fps: number[]
    memory: {
      heapUsed: number[]
      heapTotal: number[]
      external: number[]
    }
    network: {
      bandwidth: number[]
      latency: number[]
    }
    battery: {
      level: number[]
      temperature: number[]
    }
  }

  constructor() {
    this.deviceDetector = new DeviceDetector()
    this.metrics = {
      fps: [],
      memory: {
        heapUsed: [],
        heapTotal: [],
        external: []
      },
      network: {
        bandwidth: [],
        latency: []
      },
      battery: {
        level: [],
        temperature: []
      }
    }
    this.setupPerformanceObserver()
  }

  public async startProfiling(): Promise<void> {
    this.setupPerformanceObserver()
    this.startFPSMonitoring()
    this.startMemoryMonitoring()
    this.startNetworkMonitoring()
    this.startBatteryMonitoring()
  }

  public async stopProfiling(): Promise<PerformanceProfile> {
    this.performanceObserver?.disconnect()
    return this.generateReport()
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.processResourceTiming(entry as PerformanceResourceTiming)
          }
        }
      })

      try {
        this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] })
      } catch (e) {
        console.warn('PerformanceObserver setup failed:', e)
      }
    }
  }

  private startFPSMonitoring(): void {
    let frameCount = 0
    let lastTime = performance.now()

    const countFrames = () => {
      frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTime

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed)
        this.metrics.fps.push(fps)
        frameCount = 0
        lastTime = currentTime
      }

      requestAnimationFrame(countFrames)
    }

    requestAnimationFrame(countFrames)
  }

  private startMemoryMonitoring(): void {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.metrics.memory.heapUsed.push(memory.usedJSHeapSize)
        this.metrics.memory.heapTotal.push(memory.totalJSHeapSize)
        this.metrics.memory.external.push(memory.jsHeapSizeLimit)
      }
    }

    setInterval(monitorMemory, 1000)
  }

  private startNetworkMonitoring(): void {
    const monitorNetwork = async () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        this.metrics.network.bandwidth.push(connection.downlink || 0)
        this.metrics.network.latency.push(connection.rtt || 0)
      }
    }

    setInterval(monitorNetwork, 1000)
  }

  private startBatteryMonitoring(): void {
    const monitorBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery()
          this.metrics.battery.level.push(battery.level * 100)
          // Some devices provide battery temperature
          if ('temperature' in battery) {
            this.metrics.battery.temperature.push(battery.temperature)
          }
        }
      } catch (e) {
        console.warn('Battery monitoring failed:', e)
      }
    }

    setInterval(monitorBattery, 5000)
  }

  private processResourceTiming(entry: PerformanceResourceTiming): ResourceMetrics {
    const size = entry.transferSize || entry.decodedBodySize || 0
    const cached = entry.transferSize === 0 && entry.decodedBodySize > 0

    return {
      type: this.getResourceType(entry.name),
      url: entry.name,
      loadTime: entry.duration,
      size,
      cached,
      priority: entry.nextHopProtocol
    }
  }

  private getResourceType(url: string): ResourceMetrics['type'] {
    const extension = url.split('.').pop()?.toLowerCase()
    if (!extension) return 'other'

    const typeMap: Record<string, ResourceMetrics['type']> = {
      js: 'script',
      css: 'style',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      woff: 'font',
      woff2: 'font',
      ttf: 'font',
      otf: 'font'
    }

    return typeMap[extension] || 'other'
  }

  private async generateReport(): Promise<PerformanceProfile> {
    const deviceInfo = this.deviceDetector.getDeviceInfo()
    const resources = this.getResourceMetrics()
    const performanceMetrics = this.getPerformanceMetrics()

    return {
      device: deviceInfo,
      performance: {
        fps: this.calculateAverage(this.metrics.fps),
        memory: {
          heapUsed: this.calculateAverage(this.metrics.memory.heapUsed),
          heapTotal: this.calculateAverage(this.metrics.memory.heapTotal),
          external: this.calculateAverage(this.metrics.memory.external)
        },
        network: {
          bandwidth: this.calculateAverage(this.metrics.network.bandwidth),
          latency: this.calculateAverage(this.metrics.network.latency),
          type: (navigator as any).connection?.effectiveType || 'unknown'
        },
        battery: {
          level: this.calculateAverage(this.metrics.battery.level),
          charging: 'getBattery' in navigator ? (await (navigator as any).getBattery()).charging : false,
          temperature: this.calculateAverage(this.metrics.battery.temperature)
        }
      },
      resources,
      metrics: performanceMetrics
    }
  }

  private getResourceMetrics(): ResourceMetrics[] {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return entries.map(entry => this.processResourceTiming(entry))
  }

  private getPerformanceMetrics() {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    return {
      ttfb: navigationEntry?.responseStart - navigationEntry?.requestStart || 0,
      fcp: this.getFCP(),
      lcp: this.getLCP(),
      fid: this.getFID(),
      tti: this.getTTI(),
      tbt: this.getTBT()
    }
  }

  private getFCP(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcpEntry?.startTime || 0
  }

  private getLCP(): number {
    let lcp = 0
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          lcp = lastEntry.startTime
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] })
    }
    return lcp
  }

  private getFID(): number {
    let fid = 0
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const firstEntry = entries[0] as PerformanceEventTiming
        if (firstEntry?.processingStart) {
          fid = firstEntry.processingStart - firstEntry.startTime
        }
      }).observe({ entryTypes: ['first-input'] })
    }
    return fid
  }

  private getTTI(): number {
    // Simplified TTI calculation
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigationEntry?.domInteractive || 0
  }

  private getTBT(): number {
    // Simplified TBT calculation
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return (navigationEntry?.domContentLoadedEventEnd || 0) - (navigationEntry?.domContentLoadedEventStart || 0)
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const sum = numbers.reduce((a, b) => a + b, 0)
    return Math.round((sum / numbers.length) * 100) / 100
  }
}
