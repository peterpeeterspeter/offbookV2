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

// Mock MediaRecorder with proper type implementation
class MockMediaRecorder implements Partial<MediaRecorder> {
  state: MediaRecorderState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((this: MediaRecorder) => void) | null = null;
  onerror: ((event: MediaRecorderErrorEvent) => void) | null = null;
  stream: MediaStream;
  mimeType: string;

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm';
  }

  start(timeslice?: number): void {
    this.state = 'recording';
    if (this.ondataavailable) {
      setTimeout(() => {
        const blob = new Blob(['test audio data'], { type: this.mimeType });
        const event = new BlobEvent('dataavailable', { data: blob });
        this.ondataavailable?.(event);
      }, timeslice || 100);
    }
  }

  stop(): void {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop.call(this);
    }
  }

  pause(): void {
    this.state = 'paused';
  }

  resume(): void {
    this.state = 'recording';
  }

  addEventListener<K extends keyof MediaRecorderEventMap>(
    type: K,
    listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    // Implementation
  }

  removeEventListener<K extends keyof MediaRecorderEventMap>(
    type: K,
    listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void {
    // Implementation
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

// Assign mock implementations to globals with proper type assertions
global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// Mock AudioContext with proper interface implementation
class MockAudioContext implements Partial<AudioContext> {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  destination: AudioDestinationNode;
  baseLatency = 0;
  audioWorklet: AudioWorklet;

  constructor() {
    this.destination = {
      channelCount: 2,
      maxChannelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      context: this,
      numberOfInputs: 1,
      numberOfOutputs: 0,
      connect: () => {},
      disconnect: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    } as unknown as AudioDestinationNode;

    this.audioWorklet = {
      addModule: () => Promise.resolve()
    } as unknown as AudioWorklet;
  }

  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    context: this
  });

  createAnalyser = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    context: this
  });

  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// Assign mock implementations to globals with proper type assertions
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
global.webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;

describe('AudioService', () => {
  const sessionId = 'test-session';
  let audioService: AudioServiceImpl;

  beforeEach(async () => {
    // Reset singleton instance using a type assertion
    (AudioServiceImpl as any).instance = undefined;

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

    // Mock MediaRecorder with error using proper typing
    class ErrorMediaRecorder implements Partial<MediaRecorder> {
      constructor() {
        throw new Error('Recording failed');
      }
    }
    global.MediaRecorder = ErrorMediaRecorder as unknown as typeof MediaRecorder;

    await expect(audioService.startRecording(sessionId)).rejects.toThrow();
    const state = audioService.getState();
    expect(state.state).toBe(AudioServiceState.ERROR);
    expect(state.error?.code).toBe(AudioServiceError.RECORDING_FAILED);
  });
});
