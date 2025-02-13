import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserCompatibilityTester } from '@/services/mobile/browser-compatibility'
import { vi } from 'vitest'

// Import mockWebGLContext from setup.ts
const mockWebGLContext = {
  getParameter: vi.fn((param) => {
    if (param === 0x0D33) return 4096;
    return null;
  }),
  getSupportedExtensions: vi.fn(() => ['OES_texture_float']),
  getExtension: vi.fn((name) => {
    if (name === 'WEBGL_lose_context') return { loseContext: vi.fn() };
    return null;
  }),
  MAX_TEXTURE_SIZE: 0x0D33
};

describe('BrowserCompatibilityTester - Mobile', () => {
  let tester: BrowserCompatibilityTester

  beforeEach(() => {
    tester = new BrowserCompatibilityTester()
    // Reset mock calls
    vi.clearAllMocks()
  })

  it('should detect WebRTC support', async () => {
    const report = await tester.checkWebRTCSupport()

    expect(report).toMatchObject({
      getUserMedia: expect.any(Boolean),
      peerConnection: expect.any(Boolean),
      dataChannel: expect.any(Boolean),
      screenSharing: expect.any(Boolean)
    })
  })

  it('should detect audio features', async () => {
    const report = await tester.checkAudioSupport()

    expect(report).toMatchObject({
      webAudio: expect.any(Boolean),
      audioWorklet: expect.any(Boolean),
      mediaRecorder: expect.any(Boolean),
      audioCodecs: expect.any(Array)
    })
  })

  it('should detect WebGL support', async () => {
    const report = await tester.checkGraphicsSupport();

    expect(report.webgl).toBe(true);
    expect(report.webgl2).toBe(true);
    expect(report.extensions).toEqual(['OES_texture_float']);
    expect(report.maxTextureSize).toBe(4096);

    // Verify that extensions were properly queried
    expect(mockWebGLContext.getSupportedExtensions).toHaveBeenCalled();
    expect(mockWebGLContext.getParameter).toHaveBeenCalledWith(0x0D33);
  })

  it('should check storage APIs', async () => {
    const report = await tester.checkStorageSupport()

    expect(report).toMatchObject({
      localStorage: expect.any(Boolean),
      sessionStorage: expect.any(Boolean),
      indexedDB: expect.any(Boolean),
      webSQL: expect.any(Boolean),
      quota: expect.any(Number)
    })
  })

  it('should verify media features', async () => {
    const report = await tester.checkMediaFeatures()

    expect(report).toMatchObject({
      videoCodecs: expect.any(Array),
      imageFormats: expect.any(Array),
      mediaQueries: expect.any(Object),
      pictureInPicture: expect.any(Boolean)
    })
  })

  it('should check performance APIs', async () => {
    const report = await tester.checkPerformanceAPIs()

    expect(report).toMatchObject({
      performanceObserver: expect.any(Boolean),
      resourceTiming: expect.any(Boolean),
      userTiming: expect.any(Boolean),
      navigationTiming: expect.any(Boolean)
    })
  })

  it('should verify touch features', async () => {
    const report = await tester.checkTouchFeatures()

    expect(report).toMatchObject({
      touchEvents: expect.any(Boolean),
      pointerEvents: expect.any(Boolean),
      multiTouch: expect.any(Boolean),
      forceTouch: expect.any(Boolean)
    })
  })

  it('should check sensor APIs', async () => {
    const report = await tester.checkSensorAPIs()

    expect(report).toMatchObject({
      accelerometer: expect.any(Boolean),
      gyroscope: expect.any(Boolean),
      magnetometer: expect.any(Boolean),
      ambientLight: expect.any(Boolean)
    })
  })

  it('should verify web APIs', async () => {
    const report = await tester.checkWebAPIs()

    expect(report).toMatchObject({
      serviceWorker: expect.any(Boolean),
      webWorker: expect.any(Boolean),
      webSocket: expect.any(Boolean),
      webAssembly: expect.any(Boolean)
    })
  })

  it('should generate comprehensive compatibility report', async () => {
    const report = await tester.generateCompatibilityReport()

    expect(report).toMatchObject({
      browser: {
        name: expect.any(String),
        version: expect.any(String),
        engine: expect.any(String)
      },
      features: {
        webrtc: expect.any(Object),
        audio: expect.any(Object),
        graphics: expect.any(Object),
        storage: expect.any(Object),
        media: expect.any(Object),
        performance: expect.any(Object),
        input: expect.any(Object),
        sensors: expect.any(Object),
        apis: expect.any(Object)
      },
      issues: expect.any(Array),
      recommendations: expect.any(Array)
    })
  })
})

