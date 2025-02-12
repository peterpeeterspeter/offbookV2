// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Add fetch polyfill for tests
import 'whatwg-fetch';

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
  ELEVENLABS_API_KEY: 'test_elevenlabs_key',
  EMOTION_API_KEY: 'test_emotion_key'
};

// Add fetch polyfill
const fetch = require('node-fetch');
global.fetch = fetch;
global.Response = fetch.Response;
global.Headers = fetch.Headers;
global.Request = fetch.Request;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
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

// Mock WebRTC APIs
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({}),
  createAnswer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue({}),
  setRemoteDescription: jest.fn().mockResolvedValue({}),
  addIceCandidate: jest.fn().mockResolvedValue({}),
  close: jest.fn(),
}));

// Mock MediaDevices API
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({}),
  enumerateDevices: jest.fn().mockResolvedValue([]),
};

// Mock Audio Context
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn(),
  createGain: jest.fn(),
  createAnalyser: jest.fn(),
  createScriptProcessor: jest.fn(),
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
}));

// Mock ReadableStream and related APIs
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');

global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Mock TextEncoder and TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Streams API
global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));

// Mock the AudioContext and related Web Audio API features
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = {};
    this.sampleRate = 44100;
  }

  createMediaStreamSource() {
    return { connect: jest.fn() };
  }

  createAnalyser() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn()
    };
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

class MockMediaRecorder {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = jest.fn();
    this.onstop = jest.fn();
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.onstop && this.onstop();
  }
}

// Mock the global objects
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.MediaRecorder = MockMediaRecorder;

// Mock the navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockImplementation(() =>
      Promise.resolve({
        getTracks: () => [{
          stop: jest.fn()
        }]
      })
    )
  }
});

// Mock fetch responses
global.fetch = jest.fn().mockImplementation((url) => {
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
