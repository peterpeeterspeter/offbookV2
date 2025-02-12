import '@testing-library/jest-dom'
import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import React, { type ReactElement } from 'react'
import { TextEncoder, TextDecoder } from 'util'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock AudioContext and related classes
class MockAnalyserNode {
  getByteFrequencyData = vi.fn()
  getFloatTimeDomainData = vi.fn()
  fftSize = 2048
  frequencyBinCount = 1024
}

class MockGainNode {
  gain = { value: 1 }
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockAudioContext {
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

// Mock MediaStream and related classes
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks?: MediaStreamTrack[]) {
    if (tracks) {
      tracks.forEach(track => this.addTrack(track));
    }
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks;
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'audio');
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track);
    if (index !== -1) {
      this.tracks.splice(index, 1);
    }
  }
}

// Mock browser APIs
const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
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

// Helper functions to modify navigator properties for tests
export const setNavigatorProps = {
  userAgent: (value: string) => mockNavigator.userAgent = value,
  platform: (value: string) => mockNavigator.platform = value,
  onLine: (value: boolean) => mockNavigator.onLine = value
};

// Mock IndexedDB
const mockIDBRequest = {
  result: {},
  error: null,
  transaction: {
    objectStore: vi.fn(),
    oncomplete: null
  },
  onerror: null,
  onsuccess: null
}

const mockIndexedDB = {
  open: vi.fn(() => mockIDBRequest),
  deleteDatabase: vi.fn(() => mockIDBRequest)
}

// Mock WebSocket
class MockWebSocket implements WebSocket {
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

  constructor(url: string, _protocols?: string | string[]) {
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

// Update global mocks
vi.stubGlobal('MediaStream', function() {
  return {
    getTracks: () => [],
    getAudioTracks: () => [],
    addTrack: vi.fn(),
    removeTrack: vi.fn()
  }
})

vi.stubGlobal('AudioContext', MockAudioContext)
vi.stubGlobal('webkitAudioContext', MockAudioContext)
vi.stubGlobal('WebSocket', MockWebSocket)

// Mock window APIs
vi.stubGlobal('indexedDB', mockIndexedDB)

// Mock window.matchMedia
vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})))

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
}

vi.stubGlobal('localStorage', localStorageMock)

// Mock Worker
class MockWorker implements Worker {
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null

  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
  postMessage(message: any, transferOrOptions?: Transferable[] | StructuredSerializeOptions): void {
    if (this.onmessage) {
      this.onmessage.call(this, new MessageEvent('message', { data: message }))
    }
  }

  terminate(): void {
    // Implementation not needed for tests
  }

  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn()
}

// Mock MediaStreamTrack
class MockMediaStreamTrack implements MediaStreamTrack {
  enabled = true;
  id = 'mock-track-id';
  kind = 'audio';
  label = 'Mock Track';
  muted = false;
  readyState: MediaStreamTrackState = 'live';
  contentHint = '';
  isolated = false;

  onended: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onisolationchange: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;

  applyConstraints(): Promise<void> {
    return Promise.resolve();
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack();
  }

  getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  getSettings(): MediaTrackSettings {
    return {};
  }

  stop(): void {}

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

// Add new mocks to global scope
vi.stubGlobal('Worker', function MockWorker() {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
})

vi.stubGlobal('MediaStreamTrack', MockMediaStreamTrack)

// Fix for React 18 types in tests
export interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(className: string): R;
  toBeChecked(): R;
  toHaveStyle(style: Record<string, any>): R;
}

// Extend Vitest's expect method
declare module 'vitest' {
  interface Assertion extends CustomMatchers {}
}

// Fix for JSX in tests
export interface JSXElement {
  type: any;
  props: any;
  key: string | null;
}

// Helper type for React components in tests
export type ReactComponent = ReactElement | null

// Test utilities
export function createTestComponent<P extends object>(
  Component: React.ComponentType<P>,
  props: P
): React.ReactNode {
  return React.createElement(Component, props)
}

// Helper to wait for state updates
export const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to simulate audio stream
export const createMockAudioStream = () => new MockMediaStream()

// Helper to simulate WebSocket messages
export const simulateWebSocketMessage = (ws: MockWebSocket, data: any) => {
  ws.onmessage?.({ data: JSON.stringify(data) } as any)
}

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

