// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_DAILY_API_KEY: 'test-daily-key',
  NEXT_PUBLIC_DAILY_DOMAIN: 'test-domain.daily.co',
  NEXT_PUBLIC_DAILY_ROOM_URL: 'https://test-domain.daily.co/room',
  ELEVENLABS_API_KEY: 'test-elevenlabs-key',
  DEEPSEEK_API_KEY: 'test-deepseek-key',
  NODE_ENV: 'test',
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