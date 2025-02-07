import type { AudioServiceType } from "@/components/SceneFlow";
import { AudioStateManager } from './audio-state';
import type { AudioServiceStateData } from './audio-state';
import { AudioServiceState, AudioServiceEvent, AudioServiceError } from '@/types/audio';
import type {
  AudioConfig,
  RecordingResult,
  RecordingSession,
  TTSConfig,
  VADConfig,
  ElevenLabsConfig,
  TTSParams,
  TTSSession,
  CueSignal,
  CueDisplay,
  SceneProgression
} from '@/types/audio';
import { VADService } from './vad-service';

// Type declaration for WebKit AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Mock implementations for external dependencies
const mockTransformers = {
  pipeline: async () => ({
    transcribe: async (audio: any) => ({ text: "Mocked transcription" })
  })
};

/**
 * Configuration for Voice Activity Detection
 */
class MockVAD {
  constructor(config: VADConfig) {}
  processAudio() {
    return Promise.resolve({ speech: { active: true } });
  }
}

/**
 * Configuration for ElevenLabs text-to-speech service
 */
class MockElevenLabs {
  constructor(config: ElevenLabsConfig) {}
  textToSpeech(params: TTSParams) {
    return Promise.resolve(new Blob());
  }
  getVoices() {
    return Promise.resolve([
      { voice_id: "mock_voice", name: "Mock Voice" }
    ]);
  }
}

// Use mock implementations
const { pipeline } = mockTransformers;
const VAD = MockVAD;
const ElevenLabs = MockElevenLabs;

/**
 * Audio configuration
 */

/**
 * Represents an active recording session
 */

/**
 * Represents an active text-to-speech session
 */

/**
 * Cue signal for scene progression
 */

/**
 * Visual cue display configuration
 */

/**
 * Scene progression tracking
 */

/**
 * Implementation of the audio service handling recording, playback,
 * and text-to-speech functionality for script rehearsal
 */
class AudioServiceImpl implements AudioServiceType {
  private static instance: AudioServiceImpl;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private stateManager: AudioStateManager;
  private vadService: VADService | null = null;
  private isCleaningUp = false;
  private currentSession: RecordingSession | null = null;

  private constructor() {
    this.stateManager = AudioStateManager.getInstance();
    this.stateManager.restore();
    this.stateManager.transition(AudioServiceEvent.INITIALIZE, {
      state: AudioServiceState.UNINITIALIZED,
      error: null,
      context: {
        vadEnabled: false,
        networkTimeout: 10000,
        sampleRate: 44100,
        channels: 2,
        bitsPerSample: 16,
        isContextRunning: false,
        vadThreshold: 0.5,
        vadSampleRate: 16000,
        vadBufferSize: 2048,
        noiseThreshold: 0.2,
        silenceThreshold: 0.1
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
  }

  static getInstance(): AudioServiceImpl {
    if (!AudioServiceImpl.instance) {
      AudioServiceImpl.instance = new AudioServiceImpl();
    }
    return AudioServiceImpl.instance;
  }

  static getState(): AudioServiceStateData {
    const instance = AudioServiceImpl.getInstance();
    return instance.stateManager.getState();
  }

  /**
   * Initialize audio service with VAD support
   */
  async setup(): Promise<void> {
    try {
      if (this.stateManager.getState().state !== AudioServiceState.UNINITIALIZED) {
        await this.cleanup();
      }

      this.stateManager.transition(AudioServiceEvent.INITIALIZE);

      // Initialize audio context
      if (typeof window === 'undefined') {
        throw new Error('Audio is only supported in browser environments');
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported in this environment');
      }

      this.audioContext = new AudioContextClass();

      // Request microphone access
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (error) {
        throw new Error('Failed to access microphone');
      }

      const state = this.stateManager.getState();
      if (state.context.vadEnabled) {
        await this.initializeVAD();
      }

      this.stateManager.transition(AudioServiceEvent.INITIALIZED);
    } catch (error) {
      console.error('Audio setup failed:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.INITIALIZATION_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

  /**
   * Initialize VAD service
   */
  private async initializeVAD(): Promise<void> {
    try {
      if (!this.mediaStream) {
        throw new Error('Media stream not available');
      }

      const state = this.stateManager.getState();
      this.vadService = new VADService({
        sampleRate: state.context.vadSampleRate,
        bufferSize: state.context.vadBufferSize,
        noiseThreshold: state.context.noiseThreshold,
        silenceThreshold: state.context.silenceThreshold
      });

      await this.vadService.initialize(this.mediaStream);

      this.vadService.addStateListener((vadState) => {
        if (this.stateManager.getState().state === AudioServiceState.RECORDING) {
          this.stateManager.transition(AudioServiceEvent.VAD_UPDATE, {
            vad: {
              speaking: vadState.speaking,
              noiseLevel: vadState.noiseLevel,
              lastActivity: vadState.lastActivity,
              confidence: vadState.confidence
            }
          });
        }
      });
    } catch (error) {
      console.error('VAD initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      if (!this.mediaStream || !this.audioContext) {
        throw new Error('Audio service not properly initialized');
      }

      if (this.stateManager.getState().state !== AudioServiceState.READY) {
        throw new Error('Audio service not in ready state');
      }

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (error) => {
        this.stateManager.transition(AudioServiceEvent.ERROR, {
          error: this.stateManager.createError(AudioServiceError.RECORDING_FAILED, {
            originalError: error instanceof Error ? error : new Error('Recording error')
          })
        });
      };

      this.mediaRecorder.start();
      this.stateManager.transition(AudioServiceEvent.RECORDING_START);

      if (this.vadService) {
        await this.vadService.start();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.RECORDING_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

  /**
   * Stop recording and return the recorded audio
   */
  async stopRecording(): Promise<{ duration: number; accuracy: number }> {
    try {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        throw new Error('No active recording');
      }

      return new Promise((resolve, reject) => {
        this.mediaRecorder!.onstop = async () => {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.audioChunks = [];
            this.stateManager.transition(AudioServiceEvent.RECORDING_STOP);

            // Calculate duration and accuracy
            const duration = Date.now() - (this.stateManager.getState().session.startTime || 0);
            const accuracy = 1.0; // Default accuracy, should be calculated based on VAD results

            resolve({ duration, accuracy });
          } catch (error) {
            reject(error);
          }
        };

        this.mediaRecorder!.stop();
        if (this.vadService) {
          this.vadService.stop().catch(console.error);
        }
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.RECORDING_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      if (this.vadService) {
        await this.vadService.stop().catch(console.error);
        this.vadService = null;
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      if (this.audioContext) {
        await this.audioContext.close().catch(console.error);
        this.audioContext = null;
      }

      this.audioChunks = [];
      this.stateManager.transition(AudioServiceEvent.CLEANUP);
    } catch (error) {
      console.error('Cleanup failed:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.CLEANUP_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Get current state
   */
  getState(): AudioServiceStateData {
    return this.stateManager.getState();
  }

  async getCurrentSession(): Promise<RecordingSession | null> {
    return this.currentSession;
  }

  async initializeTTS(config: TTSConfig): Promise<void> {
    // Implementation will be added in a separate edit
    throw new Error("Not implemented");
  }

  async processAudioData(buffer: ArrayBuffer): Promise<void> {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
      throw new Error('Invalid audio buffer');
    }

    try {
      const audioContext = new AudioContext();
      await audioContext.decodeAudioData(buffer);
    } catch (error) {
      throw new Error('Failed to process audio data: ' + (error as Error).message);
    }
  }
}

/**
 * Singleton instance of the audio service
 */
export const AudioService = AudioServiceImpl.getInstance();
