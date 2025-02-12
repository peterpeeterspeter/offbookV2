import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../services/audio-service';

// Mock MediaRecorder type
type MockMediaRecorderType = {
  new (stream: MediaStream): Partial<MediaRecorder>;
  isTypeSupported(type: string): boolean;
};

describe('AudioService', () => {
  beforeEach(async () => {
    // Mock MediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{
            stop: vi.fn()
          }]
        })
      },
      writable: true
    });

    // Mock MediaRecorder
    const MockMediaRecorder = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null
    })) as unknown as MockMediaRecorderType;

    MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined)
    })) as unknown as typeof AudioContext;
  });

  afterEach(async () => {
    // Cleanup after each test
    await AudioService.cleanup();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await AudioService.setup();
      expect(AudioService.isReady()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to create AudioContext');
      global.AudioContext = vi.fn().mockImplementation(() => {
        throw error;
      });

      await expect(AudioService.setup()).rejects.toThrow('Failed to initialize audio context');
      expect(AudioService.isReady()).toBe(false);
    });
  });

  describe('recording', () => {
    beforeEach(async () => {
      await AudioService.setup();
    });

    it('should start recording successfully', async () => {
      await AudioService.startRecording();
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(global.MediaRecorder).toHaveBeenCalled();
    });

    it('should handle recording errors', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      await expect(AudioService.startRecording()).rejects.toThrow('Failed to start recording');
    });

    it('should stop recording and cleanup resources', async () => {
      await AudioService.startRecording();
      const result = await AudioService.stopRecording();

      expect(result).toEqual(expect.objectContaining({
        duration: expect.any(Number),
        accuracy: expect.any(Number)
      }));
    });

    it('should handle multiple recording sessions', async () => {
      // First session
      await AudioService.startRecording();
      await AudioService.stopRecording();

      // Second session
      await AudioService.startRecording();
      await AudioService.stopRecording();

      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await AudioService.setup();
      await AudioService.startRecording();
      await AudioService.cleanup();

      expect(AudioService.isReady()).toBe(false);
    });

    it('should handle cleanup during active recording', async () => {
      await AudioService.setup();
      await AudioService.startRecording();
      await AudioService.cleanup();

      expect(AudioService.isReady()).toBe(false);
      await expect(AudioService.stopRecording()).rejects.toThrow('Recording not started');
    });
  });
});
