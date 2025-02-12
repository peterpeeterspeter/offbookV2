import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioService } from '@/services/audio-service';
import {
  AudioServiceState,
  AudioServiceError,
  type RecordingResult,
  type TTSParams
} from '@/types/audio';

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn();
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: mockEnumerateDevices,
    getUserMedia: mockGetUserMedia,
    dispatchEvent: vi.fn(),
  },
  writable: true,
});

// Mock MediaRecorder
class MockMediaRecorder {
  state: string = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob() });
    }
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }
}

// @ts-expect-error - Mock MediaRecorder
global.MediaRecorder = MockMediaRecorder;

describe('AudioService', () => {
  const sessionId = 'test-session';
  const userRole = 'test-role';

  beforeEach(async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{
        stop: vi.fn()
      }]
    });
  });

  afterEach(async () => {
    await AudioService.cleanup();
    vi.clearAllMocks();
  });

  it('should initialize correctly', async () => {
    await AudioService.setup();
    const state = AudioService.getState();
    expect(state.state).toBe(AudioServiceState.READY);
  });

  it('should start recording with session ID', async () => {
    await AudioService.setup();
    await AudioService.startRecording(sessionId);
    const state = AudioService.getState();
    expect(state.state).toBe(AudioServiceState.RECORDING);
  });

  it('should stop recording and return result', async () => {
    await AudioService.setup();
    await AudioService.startRecording(sessionId);
    const result = await AudioService.stopRecording(sessionId);
    expect(result).toHaveProperty('id', sessionId);
    expect(result).toHaveProperty('audioData');
    expect(result).toHaveProperty('duration');
  });

  it('should initialize TTS with session ID and user role', async () => {
    await AudioService.setup();
    await expect(AudioService.initializeTTS(sessionId, userRole)).resolves.not.toThrow();
  });

  it('should process audio chunks', async () => {
    await AudioService.setup();
    await AudioService.startRecording(sessionId);
    const chunk = new Float32Array(1024);
    const result = await AudioService.processAudioChunk(sessionId, chunk);
    expect(typeof result).toBe('boolean');
  });

  it('should generate speech from text', async () => {
    await AudioService.setup();
    const params: TTSParams = {
      text: 'Hello world',
      voice: 'default',
      settings: {
        speed: 1,
        pitch: 1,
        volume: 1
      }
    };
    const result = await AudioService.generateSpeech(params);
    expect(result).toBeInstanceOf(Float32Array);
  });

  it('should handle cleanup correctly', async () => {
    await AudioService.setup();
    await AudioService.cleanup();
    const state = AudioService.getState();
    expect(state.state).toBe(AudioServiceState.UNINITIALIZED);
  });

  it('should handle errors during initialization', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    await expect(AudioService.setup()).rejects.toThrow();
    const state = AudioService.getState();
    expect(state.state).toBe(AudioServiceState.ERROR);
    expect(state.error?.code).toBe(AudioServiceError.INITIALIZATION_FAILED);
  });

  it('should handle errors during recording', async () => {
    await AudioService.setup();
    // @ts-expect-error - Mock MediaRecorder error
    global.MediaRecorder = class {
      constructor() {
        throw new Error('Recording failed');
      }
    };
    await expect(AudioService.startRecording(sessionId)).rejects.toThrow();
    const state = AudioService.getState();
    expect(state.state).toBe(AudioServiceState.ERROR);
    expect(state.error?.code).toBe(AudioServiceError.RECORDING_FAILED);
  });
});
