import { vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { Blob } from 'buffer'
import { ReadableStream } from 'stream/web'
import { TextEncoder, TextDecoder } from 'util'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_DEEPSEEK_API_KEY: string
      REACT_APP_ELEVENLABS_API_KEY: string
    }
  }
}

// Mock environment variables
process.env.REACT_APP_ELEVENLABS_API_KEY = 'test-key'
process.env.REACT_APP_DEEPSEEK_API_KEY = 'test-key'

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock AudioContext
class MockAudioContext {
  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 1 },
    }
  }
}

global.AudioContext = MockAudioContext as unknown as typeof AudioContext

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock web APIs if needed
if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream
}

if (!global.Blob) {
  global.Blob = Blob as unknown as typeof global.Blob
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockClear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
})

// Mock canvas context
const mockContext = {
  fillStyle: '#000000',
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({
    width: 50,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    alphabeticBaseline: 0,
    emHeightAscent: 0,
    emHeightDescent: 0,
    hangingBaseline: 0,
    ideographicBaseline: 0
  }),
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray([0, 0, 0, 255]),
    width: 100,
    height: 100,
    colorSpace: 'srgb'
  })
};

// Mock canvas getContext
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
  if (contextId === '2d') {
    return mockContext as unknown as CanvasRenderingContext2D;
  }
  return null;
});

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({}),
  enumerateDevices: vi.fn().mockResolvedValue([
    { kind: 'audioinput', deviceId: 'default' }
  ]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
} as unknown as MediaDevices;

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    mediaDevices: mockMediaDevices,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    platform: 'iPhone',
  },
  writable: true
});

// Mock window.matchMedia
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  observe(target: Element, options?: ResizeObserverOptions) {}
  unobserve(target: Element) {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver;

// Mock requestAnimationFrame
window.requestAnimationFrame = vi.fn().mockImplementation((callback: FrameRequestCallback) => {
  return window.setTimeout(() => callback(Date.now()), 0);
});

window.cancelAnimationFrame = vi.fn().mockImplementation((handle: number) => {
  window.clearTimeout(handle);
});

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}

  observe(target: Element) {}
  unobserve(target: Element) {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

window.IntersectionObserver = MockIntersectionObserver;

