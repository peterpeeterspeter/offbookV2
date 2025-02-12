import { vi, beforeEach, type Mock, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { Blob } from 'buffer'
import { ReadableStream } from 'stream/web'
import { TextEncoder, TextDecoder } from 'util'
import {
  MockMediaRecorder as MediaRecorderImpl,
  MockMediaStream as MediaStreamImpl,
  MockMediaStreamTrack as MediaStreamTrackImpl,
  MockBlobEvent as BlobEventImpl
} from './mocks/browser-apis'

// Extend ProcessEnv interface
declare global {
    interface ProcessEnv {
      REACT_APP_DEEPSEEK_API_KEY: string
      REACT_APP_ELEVENLABS_API_KEY: string
    VITE_DAILY_API_KEY: string
  }
}

// Configure longer timeout for audio processing tests
vi.setConfig({
  testTimeout: 10000,
})

// Mock environment variables
process.env.REACT_APP_ELEVENLABS_API_KEY = 'test-key'
process.env.REACT_APP_DEEPSEEK_API_KEY = 'test-key'
process.env.VITE_DAILY_API_KEY = 'test-key'

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Create a private symbol for the databases Map
// const databasesSymbol = Symbol('databases');

// Mock IndexedDB with a simpler implementation
const mockDatabases = new Map<string, any>();

// Helper to create and dispatch IDB events
// const createIDBEvent = (type: string, target: any) => { ... }

interface IDBRequest {
  result: any;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

// Mock IndexedDB
const mockIndexedDB = {
  databases: new Map(),
  open: vi.fn().mockImplementation((dbName: string): IDBRequest => {
    mockDatabases.set(dbName, {});
    const request: IDBRequest = {
      result: {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(true),
        },
        createObjectStore: vi.fn().mockReturnValue({
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          getAllKeys: vi.fn(),
        }),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
            getAllKeys: vi.fn(),
          }),
          commit: vi.fn(),
          abort: vi.fn(),
        }),
      },
      error: null,
      onsuccess: null,
      onerror: null,
    };
    setTimeout(() => request.onsuccess?.(new Event('success')), 0);
    return request;
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock localStorage
const mockStorage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
  key: vi.fn((index: number) => Array.from(mockStorage.keys())[index] ?? null),
  get length() {
    return mockStorage.size;
  }
} as Storage;

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock Service Worker
const mockServiceWorkerContainer = {
  ready: Promise.resolve({
    active: {
      state: 'activated',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    sync: {
      register: vi.fn().mockResolvedValue(undefined),
      getTags: vi.fn().mockResolvedValue([]),
    },
    pushManager: {
      subscribe: vi.fn().mockResolvedValue({
        endpoint: 'https://mock-endpoint.com',
        getKey: vi.fn(),
      }),
      getSubscription: vi.fn().mockResolvedValue(null),
      permissionState: vi.fn().mockResolvedValue('granted'),
    },
  }),
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      state: 'activated',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    },
    scope: '/',
    updateViaCache: 'none',
    update: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true),
  }),
  getRegistration: vi.fn().mockResolvedValue(null),
  getRegistrations: vi.fn().mockResolvedValue([]),
  startMessages: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as ServiceWorkerContainer

Object.defineProperty(window.navigator, 'serviceWorker', {
  configurable: true,
  enumerable: true,
  value: mockServiceWorkerContainer,
  writable: true,
})

// Mock Cache API
const cachesMock = {
  open: vi.fn().mockResolvedValue({
    add: vi.fn().mockResolvedValue(undefined),
    addAll: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(new Response()),
    put: vi.fn().mockResolvedValue(undefined),
  }),
  delete: vi.fn().mockResolvedValue(true),
  has: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
  match: vi.fn().mockResolvedValue(new Response()),
}
global.caches = cachesMock as any

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

// Mock Web Worker
class WorkerMock implements Worker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn()
}
global.Worker = WorkerMock as any

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.clear();
  mockDatabases.clear();

  // Reset AudioContext mock
  const freshMockAudioContext = new MockAudioContext();
  Object.defineProperty(window, 'AudioContext', {
    value: vi.fn().mockImplementation(() => freshMockAudioContext),
    writable: true,
    configurable: true,
  });
  global.AudioContext = window.AudioContext as unknown as typeof AudioContext;
})

// Clean up after each test
afterEach(() => {
  // Clean up any streams that might be open
  const mockStreams = new Set<ReadableStream | WritableStream>();

  // Track compression streams
  if (global.CompressionStream) {
    const originalCompressionStream = global.CompressionStream;
    global.CompressionStream = class extends originalCompressionStream {
      constructor(format: CompressionFormat) {
        super(format);
        mockStreams.add(this.readable as unknown as ReadableStream);
        mockStreams.add(this.writable as unknown as WritableStream);
      }
    } as unknown as typeof CompressionStream;
  }

  // Track decompression streams
  if (global.DecompressionStream) {
    const originalDecompressionStream = global.DecompressionStream;
    global.DecompressionStream = class extends originalDecompressionStream {
      constructor(format: CompressionFormat) {
        super(format);
        mockStreams.add(this.readable as unknown as ReadableStream);
        mockStreams.add(this.writable as unknown as WritableStream);
      }
    } as unknown as typeof DecompressionStream;
  }

  // Clean up all tracked streams
  mockStreams.forEach(stream => {
    if (stream instanceof ReadableStream) {
      stream.cancel().catch(() => {});
    } else if (stream instanceof WritableStream) {
      stream.abort().catch(() => {});
    }
  });

  // Clear all mock databases
  mockDatabases.clear();

  // Clear all mock event listeners
  interface EventTarget {
    eventListeners?: Set<unknown>;
  }

  const mockElements = {
    window: window as unknown as EventTarget,
    document: document as unknown as EventTarget,
    body: document.body as unknown as EventTarget
  };

  Object.values(mockElements).forEach(target => {
    if (target?.eventListeners) {
      target.eventListeners.clear();
    }
  });

  // Reset all mocks
  vi.clearAllMocks();
  vi.clearAllTimers();

  // Clear any remaining timeouts or intervals
  vi.useRealTimers();
});

// Mock canvas API
const mockContext = {
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }),
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  createImageData: vi.fn(),
  getParameter: vi.fn().mockReturnValue(true),
  getSupportedExtensions: vi.fn().mockReturnValue([]),
  getExtension: vi.fn().mockReturnValue(null),
  getShaderPrecisionFormat: vi.fn().mockReturnValue({
    precision: 23,
    rangeMin: 127,
    rangeMax: 127
  }),
  getContextAttributes: vi.fn().mockReturnValue({
    alpha: true,
    antialias: true,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'default',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: true,
    desynchronized: false
  })
}

const mockCanvas = {
  getContext: vi.fn((contextId: string) => {
    if (contextId === 'webgl' || contextId === 'webgl2' || contextId === '2d') {
      return mockContext
    }
    return null
  }),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,'),
  toBlob: vi.fn().mockImplementation(callback => callback(new MockBlob([]))),
  width: 300,
  height: 150
}

// Mock document.createElement for canvas
const originalCreateElement = document.createElement.bind(document)
vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
  if (tagName.toLowerCase() === 'canvas') {
    return mockCanvas as any
  }
  return originalCreateElement(tagName)
})

// Mock MediaStream implementation
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  getTracks() {
    return [...this.tracks];
  }

  getAudioTracks() {
    return this.tracks.filter(track => track.kind === 'audio');
  }

  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
  }
}

// Mock MediaStreamTrack implementation
class MockMediaStreamTrack implements MediaStreamTrack {
  enabled = true;
  id = 'mock-track-id';
  kind = 'audio' as MediaStreamTrack['kind'];
  label = 'Mock Audio Track';
  muted = false;
  readyState: MediaStreamTrackState = 'live';
  contentHint = '';
  isolated = false;
  onended: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;

  stop = vi.fn();
  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack();
  }
  getCapabilities = vi.fn(() => ({}));
  getConstraints = vi.fn(() => ({}));
  getSettings = vi.fn(() => ({
    deviceId: 'default',
    groupId: 'default',
    sampleRate: 44100,
    sampleSize: 16,
    channelCount: 2,
  }));

  applyConstraints = vi.fn().mockResolvedValue(undefined);
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
}

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn().mockImplementation(async (constraints: MediaStreamConstraints) => {
    if (!constraints?.audio) {
      throw new Error('Audio constraints required');
    }
    const track = new MockMediaStreamTrack();
    return new MockMediaStream([track]);
  }),
  enumerateDevices: vi.fn().mockResolvedValue([{
    deviceId: 'default',
    kind: 'audioinput',
    label: 'Default Audio Device',
    groupId: 'default'
  }]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
};

// Set up navigator.mediaDevices mock
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
  configurable: true
});

Object.defineProperty(window.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
  configurable: true
});

// Mock AudioParam implementation
class AudioParamMock implements AudioParam {
  private _value: number;
  readonly automationRate: AutomationRate = 'a-rate';
  readonly defaultValue: number;
  readonly maxValue: number = 3.4028234663852886e38;
  readonly minValue: number = -3.4028234663852886e38;
  readonly name: string = '';
  readonly units: string = '';

  constructor(defaultValue: number) {
    this._value = defaultValue;
    this.defaultValue = defaultValue;
  }

  get value(): number {
    return this._value;
  }

  set value(newValue: number) {
    this._value = newValue;
  }

  setValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
  exponentialRampToValueAtTime = vi.fn().mockReturnThis();
  setTargetAtTime = vi.fn().mockReturnThis();
  setValueCurveAtTime = vi.fn().mockReturnThis();
  cancelScheduledValues = vi.fn().mockReturnThis();
  cancelAndHoldAtTime = vi.fn().mockReturnThis();
}

// Mock AudioContext
class MockAudioContext implements AudioContext {
  baseLatency = 0;
  outputLatency = 0;
  audioWorklet = {
    addModule: vi.fn().mockResolvedValue(undefined)
  };
  sampleRate = 48000;
  state: AudioContextState = 'running';
  destination = {
    channelCount: 2,
    maxChannelCount: 2
  } as AudioDestinationNode;
  listener = {} as AudioListener;
  currentTime = 0;

  createScriptProcessor() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as ScriptProcessorNode;
  }

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as MediaStreamAudioSourceNode;
  }

  createAnalyser() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn(),
      getFloatTimeDomainData: vi.fn()
    } as unknown as AnalyserNode;
  }

  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn().mockReturnValue(true);
}

// Add to global
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// Mock Blob.arrayBuffer
const originalBlob = global.Blob
class MockBlob extends originalBlob {
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0))
  }
}
global.Blob = MockBlob as any

declare global {
  interface Window {
    AudioContext: typeof MockAudioContext;
    webkitAudioContext: typeof MockAudioContext;
  }
}

// Mock WebGL context
const mockWebGLContext = {
  getParameter: vi.fn().mockReturnValue(4096),
  getSupportedExtensions: vi.fn().mockReturnValue(['OES_texture_float', 'WEBGL_depth_texture']),
  MAX_TEXTURE_SIZE: 0x0D33
};

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLContext;
  }
  if (contextType === 'webgl2') {
    return mockWebGLContext;
  }
  return null;
});

