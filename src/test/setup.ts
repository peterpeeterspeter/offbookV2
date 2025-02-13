import '@testing-library/jest-dom'
import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { TextEncoder, TextDecoder } from 'util'
import 'whatwg-fetch'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock AudioContext and related classes
class BaseAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  destination = {};
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn()
  });
  createAnalyser = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn()
  });
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

class MockAudioContext extends BaseAudioContext {
  baseLatency = 0;
  outputLatency = 0;

  createMediaElementSource() {
    return { connect: vi.fn() };
  }

  createMediaStreamDestination() {
    return { stream: mockMediaStream };
  }
}

// Mock WebSocket
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  url = '';
  readyState = MockWebSocket.CONNECTING;

  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;

  private eventListeners: Record<string, Array<(ev: Event) => any>> = {
    open: [],
    close: [],
    error: [],
    message: []
  };

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  });

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (ev: WebSocketEventMap[K]) => any
  ): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener as (ev: Event) => any);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (ev: WebSocketEventMap[K]) => any
  ): void {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(
      l => l !== (listener as (ev: Event) => any)
    );
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => listener(event));

    const handlerName = `on${event.type}` as keyof MockWebSocket;
    const handler = this[handlerName] as ((ev: Event) => any) | null;
    if (handler) {
      handler.call(this, event);
    }
    return true;
  }
}

// Mock MediaStream
const mockMediaStream: MediaStream = {
  active: true,
  id: 'mock-stream-id',
  onaddtrack: null,
  onremovetrack: null,
  getAudioTracks: vi.fn().mockReturnValue([{
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: vi.fn()
  }]),
  getVideoTracks: vi.fn().mockReturnValue([]),
  getTracks: vi.fn().mockReturnValue([{
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: vi.fn()
  }]),
  getTrackById: vi.fn().mockReturnValue(null),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  clone: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
};

// Mock browser APIs
const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
  enumerateDevices: vi.fn().mockResolvedValue([
    { kind: 'audioinput', deviceId: 'default', label: 'Default' }
  ])
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test)',
  platform: 'Test',
  mediaDevices: mockMediaDevices,
  onLine: true,
  hardwareConcurrency: 4
};

vi.stubGlobal('navigator', mockNavigator);
vi.stubGlobal('WebSocket', MockWebSocket);

// Helper functions
export const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

export const createMockAudioStream = () => mockMediaStream;

export const simulateWebSocketMessage = (ws: WebSocket, data: any) => {
  const event = new MessageEvent('message', { data });
  ws.dispatchEvent(event);
};

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// Mock browser APIs
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

let documentVisibilityState: DocumentVisibilityState = 'visible';

Object.defineProperty(document, 'visibilityState', {
  get: () => documentVisibilityState,
  configurable: true
});

Object.defineProperty(document, 'hidden', {
  get: () => documentVisibilityState === 'hidden',
  configurable: true
});

// Helper function to change visibility state
export function setDocumentVisibility(state: DocumentVisibilityState) {
  documentVisibilityState = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_DAILY_API_KEY: 'test-daily-key',
  NEXT_PUBLIC_DAILY_DOMAIN: 'test-domain.daily.co',
  NEXT_PUBLIC_DAILY_ROOM_URL: 'https://test-domain.daily.co/room',
  ELEVENLABS_API_KEY: 'test-elevenlabs-key',
  DEEPSEEK_API_KEY: 'test-deepseek-key',
  NODE_ENV: 'test',
  WHISPER_API_ENDPOINT: 'https://api.whisper.ai/v1/transcribe',
  ELEVENLABS_API_ENDPOINT: 'https://api.elevenlabs.ai/v1',
  EMOTION_API_ENDPOINT: 'https://api.emotion.ai/v1/detect',
  WHISPER_API_KEY: 'test_whisper_key',
  EMOTION_API_KEY: 'test_emotion_key'
};

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
});

// Mock WebRTC APIs
const mockRTCPeerConnection = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({}),
  createAnswer: vi.fn().mockResolvedValue({}),
  setLocalDescription: vi.fn().mockResolvedValue({}),
  setRemoteDescription: vi.fn().mockResolvedValue({}),
  addIceCandidate: vi.fn().mockResolvedValue({}),
  close: vi.fn(),
})) as unknown as typeof RTCPeerConnection;

mockRTCPeerConnection.generateCertificate = () =>
  Promise.resolve({} as RTCCertificate);

global.RTCPeerConnection = mockRTCPeerConnection;

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({}),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock Audio Context
(global as any).AudioContext = MockAudioContext;
(global as any).webkitAudioContext = MockAudioContext;

// Mock MediaRecorder
interface MockMediaRecorderType {
  state: string;
  ondataavailable: ((event: any) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
}

class MockMediaRecorderImpl implements MockMediaRecorderType {
  state: string = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
}

global.MediaRecorder = MockMediaRecorderImpl as any;

// Mock fetch responses
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('whisper')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ text: 'Mocked transcription', confidence: 0.95 })
    });
  }
  if (url.includes('elevenlabs')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ audio: new ArrayBuffer(1024) })
    });
  }
  if (url.includes('emotion')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ type: 'happy', confidence: 0.85 })
    });
  }
  return Promise.reject(new Error('Not found'));
});

