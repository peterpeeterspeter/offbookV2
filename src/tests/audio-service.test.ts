import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioServiceImpl } from '@/services/audio-service';
import {
  AudioServiceState,
  AudioServiceError
} from '@/types/audio';

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn();
const mockGetUserMedia = vi.fn();
const mockMediaDevices = {
  enumerateDevices: mockEnumerateDevices,
  getUserMedia: mockGetUserMedia,
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
  configurable: true
});

// Mock MediaRecorder with more complete implementation
class MockMediaRecorder {
  state: string = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  start(timeslice?: number) {
    this.state = 'recording';
    const handler = this.ondataavailable;
    if (handler) {
      // Simulate data available event
      setTimeout(() => {
        handler({ data: new Blob(['test audio data'], { type: 'audio/webm' }) });
      }, timeslice || 100);
    }
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }
}

// @ts-expect-error - Mock MediaRecorder
global.MediaRecorder = MockMediaRecorder;

// Mock AudioContext
class MockAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  destination = {
    channelCount: 2,
    maxChannelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers'
  };

  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn()
  });

  createAnalyser = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn()
  });

  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// @ts-expect-error - Mock AudioContext
global.AudioContext = MockAudioContext;
// @ts-expect-error - Mock webkitAudioContext
global.webkitAudioContext = MockAudioContext;

describe('AudioService', () => {
  const sessionId = 'test-session';
  let audioService: AudioServiceImpl;

  beforeEach(async () => {
    // Reset singleton instance
    // @ts-expect-error - Accessing private static for testing
    AudioServiceImpl.instance = undefined;

    mockGetUserMedia.mockResolvedValue({
      getAudioTracks: () => [{
        enabled: true,
        muted: false,
        readyState: 'live',
        stop: vi.fn()
      }],
      getTracks: () => [{
        enabled: true,
        muted: false,
        readyState: 'live',
        stop: vi.fn()
      }]
    });

    audioService = AudioServiceImpl.getInstance();
  });

  afterEach(async () => {
    await audioService.cleanup();
    vi.clearAllMocks();
  });

  it('should initialize correctly', async () => {
    await audioService.setup();
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.READY);
  });

  it('should start recording', async () => {
    await audioService.setup();
    await audioService.startRecording(sessionId);
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.RECORDING);
  });

  it('should stop recording and return result', async () => {
    await audioService.setup();
    await audioService.startRecording(sessionId);
    const result = await audioService.stopRecording(sessionId);
    expect(result).toHaveProperty('audioData');
    expect(result).toHaveProperty('duration');
  });

  it('should initialize TTS', async () => {
    await audioService.setup();
    await expect(audioService.initializeTTS()).resolves.not.toThrow();
  });

  it('should process audio chunks', async () => {
    await audioService.setup();
    await audioService.startRecording(sessionId);
    const result = await audioService.processAudioChunk();
    expect(typeof result).toBe('boolean');
  });

  it('should generate speech from text', async () => {
    await audioService.setup();
    const result = await audioService.generateSpeech();
    expect(result).toBeInstanceOf(Float32Array);
  });

  it('should handle cleanup correctly', async () => {
    await audioService.setup();
    await audioService.cleanup();
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.UNINITIALIZED);
  });

  it('should handle errors during initialization', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    await expect(audioService.setup()).rejects.toThrow();
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.ERROR);
    expect(state.error?.code).toBe(AudioServiceError.INITIALIZATION_FAILED);
  });

  it('should handle errors during recording', async () => {
    await audioService.setup();
    // @ts-expect-error - Mock MediaRecorder error
    global.MediaRecorder = class {
      constructor() {
        throw new Error('Recording failed');
      }
    };
    await expect(audioService.startRecording(sessionId)).rejects.toThrow();
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.ERROR);
    expect(state.error?.code).toBe(AudioServiceError.RECORDING_FAILED);
  });
});
