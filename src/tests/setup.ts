import { vi, beforeEach, type Mock, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { Blob } from 'buffer'
import { ReadableStream } from 'stream/web'
import { TextEncoder, TextDecoder } from 'util'
import {
  MockAudioContext as AudioContextImpl,
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
const databasesSymbol = Symbol('databases');

// Mock IndexedDB with a simpler implementation
const mockDatabases = new Map<string, any>();

// Helper to create and dispatch IDB events
const createIDBEvent = (type: string, target: any) => {
  const event = new Event(type)
  Object.defineProperty(event, 'target', { value: target })
  return event
}

interface IDBRequest {
  result: any;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

// Mock IndexedDB
const mockIndexedDB = {
  databases: new Map(),
  open: vi.fn().mockImplementation((name: string): IDBRequest => {
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
            put: vi.fn().mockImplementation((value: any, key: string): IDBRequest => {
              const putRequest: IDBRequest = {
                result: key,
                error: null,
                onsuccess: null,
                onerror: null
              };
              setTimeout(() => putRequest.onsuccess?.(new Event('success')), 0);
              return putRequest;
            }),
            get: vi.fn().mockImplementation((key: string): IDBRequest => {
              const getRequest: IDBRequest = {
                result: mockIndexedDB.databases.get(key),
                error: null,
                onsuccess: null,
                onerror: null
              };
              setTimeout(() => getRequest.onsuccess?.(new Event('success')), 0);
              return getRequest;
            }),
            delete: vi.fn().mockImplementation((key: string): IDBRequest => {
              const deleteRequest: IDBRequest = {
                result: undefined,
                error: null,
                onsuccess: null,
                onerror: null
              };
              mockIndexedDB.databases.delete(key);
              setTimeout(() => deleteRequest.onsuccess?.(new Event('success')), 0);
              return deleteRequest;
            }),
            clear: vi.fn().mockImplementation((): IDBRequest => {
              const clearRequest: IDBRequest = {
                result: undefined,
                error: null,
                onsuccess: null,
                onerror: null
              };
              mockIndexedDB.databases.clear();
              setTimeout(() => clearRequest.onsuccess?.(new Event('success')), 0);
              return clearRequest;
            }),
            getAllKeys: vi.fn().mockImplementation((): IDBRequest => {
              const getAllKeysRequest: IDBRequest = {
                result: Array.from(mockIndexedDB.databases.keys()),
                error: null,
                onsuccess: null,
                onerror: null
              };
              setTimeout(() => getAllKeysRequest.onsuccess?.(new Event('success')), 0);
              return getAllKeysRequest;
            }),
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

// Mock MediaRecorder
class MediaRecorderMock {
  static isTypeSupported(type: string): boolean {
    return true
  }

  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  stream: MediaStream
  mimeType = 'audio/webm'
  audioBitsPerSecond = 128000
  videoBitsPerSecond = 2500000
  private timesliceMs?: number
  private dataAvailableTimer?: number

  ondataavailable: ((event: BlobEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onpause: (() => void) | null = null
  onresume: (() => void) | null = null
  onstart: (() => void) | null = null
  onstop: (() => void) | null = null

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream
    if (options?.mimeType) this.mimeType = options.mimeType
    if (options?.audioBitsPerSecond) this.audioBitsPerSecond = options.audioBitsPerSecond
    if (options?.videoBitsPerSecond) this.videoBitsPerSecond = options.videoBitsPerSecond
  }

  start(timeslice?: number) {
    this.state = 'recording'
    this.timesliceMs = timeslice
    if (this.onstart) this.onstart()

    if (this.timesliceMs) {
      this.dataAvailableTimer = window.setInterval(() => {
        this.dispatchDataAvailable()
      }, this.timesliceMs)
    }
  }

  stop() {
    if (this.dataAvailableTimer) {
      window.clearInterval(this.dataAvailableTimer)
    }
    this.state = 'inactive'
    this.dispatchDataAvailable()
    if (this.onstop) this.onstop()
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused'
      if (this.onpause) this.onpause()
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'recording'
      if (this.onresume) this.onresume()
    }
  }

  requestData() {
    if (this.state !== 'inactive') {
      this.dispatchDataAvailable()
    }
  }

  private dispatchDataAvailable() {
    if (this.ondataavailable) {
      const blob = new Blob([], { type: this.mimeType })
      const event = new BlobEvent('dataavailable', { data: blob })
      this.ondataavailable(event)
    }
  }
}

global.MediaRecorder = MediaRecorderMock as any

// Add BlobEvent type definition
class BlobEvent extends Event {
  readonly data: Blob;

  constructor(type: string, eventInitDict: { data: Blob }) {
    super(type);
    this.data = eventInitDict.data;
  }
}

// Mock AudioContext
class AudioParamMock implements AudioParam {
  private _value: number;
  automationRate: AutomationRate = 'a-rate';
  defaultValue: number;
  maxValue: number = 3.4028234663852886e38;
  minValue: number = -3.4028234663852886e38;
  readonly name: string = '';
  units: string = 'number';

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

  setValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number): AudioParam {
    this._value = target;
    return this;
  }

  setValueCurveAtTime(values: Float32Array, startTime: number, duration: number): AudioParam {
    this._value = values[values.length - 1];
    return this;
  }

  cancelScheduledValues(startTime: number): AudioParam {
    return this;
  }

  cancelAndHoldAtTime(cancelTime: number): AudioParam {
    return this;
  }
}

class DynamicsCompressorNodeMock implements DynamicsCompressorNode {
  threshold: AudioParamMock;
  knee: AudioParamMock;
  ratio: AudioParamMock;
  attack: AudioParamMock;
  release: AudioParamMock;
  reduction: number;
  channelCount: number;
  channelCountMode: ChannelCountMode;
  channelInterpretation: ChannelInterpretation;
  context: BaseAudioContext;
  numberOfInputs: number;
  numberOfOutputs: number;
  readonly playbackRate: AudioParam;
  readonly detune: AudioParam;
  readonly loop: boolean;
  readonly loopStart: number;
  readonly loopEnd: number;
  readonly buffer: AudioBuffer | null;
  readonly bufferSize: number;

  constructor(context: BaseAudioContext) {
    this.threshold = new AudioParamMock(-24);
    this.knee = new AudioParamMock(30);
    this.ratio = new AudioParamMock(12);
    this.attack = new AudioParamMock(0.003);
    this.release = new AudioParamMock(0.25);
    this.reduction = -10;
    this.channelCount = 2;
    this.channelCountMode = 'explicit';
    this.channelInterpretation = 'speakers';
    this.context = context;
    this.numberOfInputs = 1;
    this.numberOfOutputs = 1;
    this.playbackRate = new AudioParamMock(1);
    this.detune = new AudioParamMock(0);
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.buffer = null;
    this.bufferSize = 0;
  }

  connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode;
  connect(destinationParam: AudioParam, output?: number): void;
  connect(destination: AudioNode | AudioParam, output?: number, input?: number): AudioNode | void {
    if (destination instanceof AudioNode) {
      return destination;
    }
  }

  disconnect(): void;
  disconnect(output: number): void;
  disconnect(destinationNode: AudioNode, output?: number, input?: number): void;
  disconnect(destinationParam: AudioParam, output?: number): void;
  disconnect(destination?: number | AudioNode | AudioParam, output?: number, input?: number): void {
    // No-op
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    // No-op
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    // No-op
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

class MockAudioContext {
  public state: AudioContextState = 'running';
  public sampleRate = 44100;
  public baseLatency = 0.005;
  public destination = {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    maxChannelCount: 2,
    numberOfInputs: 1,
    numberOfOutputs: 0,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  constructor() {
    // Bind all methods to ensure they're available
    this.createDynamicsCompressor = this.createDynamicsCompressor.bind(this);
    this.createGain = this.createGain.bind(this);
    this.createOscillator = this.createOscillator.bind(this);
    this.createAnalyser = this.createAnalyser.bind(this);
    this.createScriptProcessor = this.createScriptProcessor.bind(this);
    this.suspend = this.suspend.bind(this);
    this.resume = this.resume.bind(this);
    this.close = this.close.bind(this);
  }

  createDynamicsCompressor(this: MockAudioContext): DynamicsCompressorNode {
    const compressor = {
      threshold: new AudioParamMock(-24),
      knee: new AudioParamMock(30),
      ratio: new AudioParamMock(12),
      attack: new AudioParamMock(0.003),
      release: new AudioParamMock(0.25),
      reduction: -20,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    // Ensure the method is bound to the object
    compressor.connect = compressor.connect.bind(compressor);
    compressor.disconnect = compressor.disconnect.bind(compressor);

    return compressor as unknown as DynamicsCompressorNode;
  }

  createGain(this: MockAudioContext): GainNode {
    return {
      gain: new AudioParamMock(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as GainNode;
  }

  createOscillator(this: MockAudioContext): OscillatorNode {
    return {
      frequency: new AudioParamMock(440),
      detune: new AudioParamMock(0),
      type: 'sine',
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as OscillatorNode;
  }

  createAnalyser(this: MockAudioContext): AnalyserNode {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getFloatFrequencyData: vi.fn(),
      getByteFrequencyData: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as AnalyserNode;
  }

  createScriptProcessor(
    this: MockAudioContext,
    bufferSize = 4096,
    numberOfInputChannels = 2,
    numberOfOutputChannels = 2
  ): ScriptProcessorNode {
    return {
      bufferSize,
      numberOfInputs: numberOfInputChannels,
      numberOfOutputs: numberOfOutputChannels,
      onaudioprocess: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ScriptProcessorNode;
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

// Register the mock AudioContext globally
Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

// Also register as webkitAudioContext for Safari compatibility
Object.defineProperty(window, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
});

// Create a mock instance for direct use in tests
const mockAudioContext = new MockAudioContext();
Object.defineProperty(window, 'mockAudioContext', {
  value: mockAudioContext,
  writable: true,
  configurable: true,
});

// Mock MediaStream and MediaStreamTrack
class MockMediaStreamTrack {
  enabled = true
  id = 'mock-track-id'
  kind = 'audio'
  label = 'Mock Audio Track'
  muted = false
  readyState = 'live'
  stop = vi.fn()
  clone = vi.fn().mockReturnThis()
  getSettings = vi.fn().mockReturnValue({
    deviceId: 'default',
    groupId: 'default',
    sampleRate: 44100,
    sampleSize: 16,
    channelCount: 2,
  })
}

class MockMediaStream {
  active = true
  id = 'mock-stream-id'
  private _tracks: MockMediaStreamTrack[] = []

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this._tracks = [...tracks]
  }

  addTrack(track: MockMediaStreamTrack) {
    if (!this._tracks.includes(track)) {
      this._tracks.push(track)
    }
  }

  removeTrack(track: MockMediaStreamTrack) {
    this._tracks = this._tracks.filter(t => t !== track)
  }

  getTracks() {
    return [...this._tracks]
  }

  getAudioTracks() {
    return this._tracks.filter(t => t.kind === 'audio')
  }

  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video')
  }

  clone() {
    return new MockMediaStream(this._tracks.map(t => t.clone()))
  }
}

global.MediaStream = MockMediaStream as any
global.MediaStreamTrack = MockMediaStreamTrack as any

// Type definitions
declare global {
  interface Window {
    Blob: typeof Blob
    BlobEvent: typeof BlobEventImpl
    AudioContext: typeof AudioContextImpl
    MediaRecorder: typeof MediaRecorderImpl
    MediaStream: typeof MediaStreamImpl
    MediaStreamTrack: typeof MediaStreamTrackImpl
    ElevenLabs: ElevenLabsAPI
    __FORCE_BATTERY_API__: boolean
    mockAudioContext: typeof MockAudioContext
  }
}

// Add mocks to global scope
Object.defineProperty(window, 'AudioContext', { value: AudioContextImpl })
Object.defineProperty(window, 'MediaRecorder', { value: MediaRecorderImpl })
Object.defineProperty(window, 'MediaStream', { value: MediaStreamImpl })
Object.defineProperty(window, 'MediaStreamTrack', { value: MediaStreamTrackImpl })
Object.defineProperty(window, 'BlobEvent', { value: BlobEventImpl })

// Suppress console errors during tests
const originalConsoleError = console.error
console.error = vi.fn(originalConsoleError)

// Mock Battery API
interface MockBatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

const mockBattery: MockBatteryManager = {
  charging: true,
  chargingTime: 0,
  dischargingTime: Infinity,
  level: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

declare global {
  interface Navigator {
    getBattery(): Promise<MockBatteryManager>;
  }
}

navigator.getBattery = vi.fn().mockResolvedValue(mockBattery);

// Mock WebGL
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  // Add other WebGL methods as needed
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockWebGLContext)

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

// ElevenLabs API types
interface ElevenLabsVoice {
  id: string;
  name: string;
}

interface ElevenLabsModel {
  id: string;
  name: string;
}

interface ElevenLabsAPI {
  synthesizeSpeech: (text: string, options?: any) => Promise<Uint8Array>;
  getVoices: () => Promise<ElevenLabsVoice[]>;
  getModels: () => Promise<ElevenLabsModel[]>;
}

// Mock ElevenLabs API
const mockElevenLabs: ElevenLabsAPI = {
  synthesizeSpeech: vi.fn().mockImplementation(async (text: string, options?: any) => {
    if (!text) {
      throw new Error('No text provided');
    }

    // Create a mock ReadableStream that emits audio data
    return new ReadableStream({
      start(controller) {
        if (text === 'trigger_error') {
          controller.error(new Error('ElevenLabs API error: Internal Server Error'));
          return;
        }
        if (text === 'trigger_network_error') {
          controller.error(new Error('Network error'));
          return;
        }
        if (text === 'trigger_empty_response') {
          controller.close();
          return;
        }

        // Emit mock audio data
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      }
    });
  }),
  getVoices: vi.fn().mockResolvedValue([
    { id: 'voice1', name: 'Voice 1' },
    { id: 'voice2', name: 'Voice 2' },
  ]),
  getModels: vi.fn().mockResolvedValue([
    { id: 'model1', name: 'Model 1' },
    { id: 'model2', name: 'Model 2' },
  ]),
};

Object.defineProperty(window, 'ElevenLabs', {
  value: mockElevenLabs,
  writable: true,
});

