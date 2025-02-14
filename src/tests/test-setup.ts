import { vi, type Mock } from 'vitest'
import {
  MockAudioContext,
  MockMediaRecorder,
  MockMediaStream,
  MockMediaStreamTrack,
  MockBlobEvent,
  MockBlob
} from './mocks/browser-apis'

// Extend global interface
declare global {
  interface Window {
    AudioContext: typeof AudioContext
    MediaRecorder: typeof MediaRecorder
    MediaStream: typeof MediaStream
    MediaStreamTrack: typeof MediaStreamTrack
    BlobEvent: typeof BlobEvent
  }

  let simulateBrowser: (browser: 'chrome' | 'firefox' | 'safari' | 'mobile-safari', options?: { forceBatteryAPI?: boolean }) => void
  let mockBlob: Blob
  let mockResponse: any
  let mockFetch: Mock
  let mockWebSocket: {
    send: Mock
    close: Mock
    addEventListener: Mock
    removeEventListener: Mock
  }
}

// Create mock objects
const mockBlob = new MockBlob(['test audio data'], { type: 'audio/webm' })
const mockResponse = {
  text: 'Hello world',
  confidence: 0.95,
  duration: 1.5,
  emotion: 'neutral'
}
const mockFetch = vi.fn()
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Browser simulation function
const simulateBrowser = (browser: 'chrome' | 'firefox' | 'safari' | 'mobile-safari', options?: { forceBatteryAPI?: boolean }) => {
  const userAgents = {
    chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'mobile-safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
  }

  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: {
      ...global.navigator,
      userAgent: userAgents[browser],
      hardwareConcurrency: browser.includes('mobile') ? 4 : 8,
      platform: browser.includes('mobile') ? 'iPhone' : 'MacIntel',
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
        enumerateDevices: vi.fn().mockResolvedValue([])
      }
    },
    configurable: true,
    writable: true
  })

  // Mock Battery API
  if (options?.forceBatteryAPI) {
    Object.defineProperty(global.navigator, 'getBattery', {
      value: () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }),
      configurable: true,
      writable: true
    })
  } else {
    delete (global.navigator as any).getBattery
  }
}

// Add mocks to global scope
const globalAny = global as any

// Set up browser API mocks
if (!globalAny.AudioContext) {
  globalAny.AudioContext = MockAudioContext
}

if (!globalAny.MediaRecorder) {
  globalAny.MediaRecorder = MockMediaRecorder
}

if (!globalAny.MediaStream) {
  globalAny.MediaStream = MockMediaStream
}

if (!globalAny.MediaStreamTrack) {
  globalAny.MediaStreamTrack = MockMediaStreamTrack
}

if (!globalAny.BlobEvent) {
  globalAny.BlobEvent = MockBlobEvent
}

// Set up test utilities
globalAny.simulateBrowser = simulateBrowser
globalAny.mockBlob = mockBlob
globalAny.mockResponse = mockResponse
globalAny.mockFetch = mockFetch
globalAny.mockWebSocket = mockWebSocket

// Suppress console errors during tests
vi.spyOn(console, 'error').mockImplementation(() => {})
