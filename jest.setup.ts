import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { ReadableStream, TransformStream } from 'web-streams-polyfill';

// Add web streams to global
(global as any).ReadableStream = ReadableStream;
(global as any).TransformStream = TransformStream;

// Mock environment variables
process.env.NEXT_PUBLIC_WHISPER_API_ENDPOINT = 'http://localhost:3000/api/whisper';
process.env.NEXT_PUBLIC_ELEVENLABS_API_ENDPOINT = 'http://localhost:3000/api/elevenlabs';
process.env.NEXT_PUBLIC_EMOTION_API_ENDPOINT = 'http://localhost:3000/api/emotion';

// Mock AudioContext
class MockAudioContext implements Partial<AudioContext> {
  createGain(): GainNode {
    return {
      connect: jest.fn(),
      gain: { value: 1 },
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      context: this,
      numberOfInputs: 1,
      numberOfOutputs: 1,
      disconnect: jest.fn(),
    } as unknown as GainNode;
  }
  createMediaStreamSource = jest.fn().mockReturnValue({
    connect: jest.fn(),
  });
  createScriptProcessor = jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    addEventListener: jest.fn(),
  });
}

// Mock MediaRecorder
class MockMediaRecorder implements Partial<MediaRecorder> {
  start = jest.fn();
  stop = jest.fn();
  ondataavailable = jest.fn();
  state: RecordingState = 'inactive';
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

// Define global mocks
Object.defineProperty(global, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(global, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(global, 'MediaRecorder', {
  value: MockMediaRecorder,
  writable: true,
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
      }],
    }),
  },
  writable: true,
});

// Mock fetch responses
const mockFetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes('/api/whisper')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ text: 'Mocked transcription', confidence: 0.9 }),
    });
  }
  if (url.includes('/api/elevenlabs')) {
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  }
  if (url.includes('/api/emotion')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ emotion: 'happy', confidence: 0.8 }),
    });
  }
  return Promise.reject(new Error('Not found'));
});

global.fetch = mockFetch;

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(global, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors during tests
console.error = jest.fn();

// Export empty module to make TypeScript happy
export {};
