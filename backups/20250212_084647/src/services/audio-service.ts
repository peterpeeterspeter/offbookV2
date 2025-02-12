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
import { createMockBlobAsync } from '../tests/mocks/browser-apis';

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
        sampleRate: 44100,
        channels: 2,
        isContextRunning: false,
        vadEnabled: false,
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

  async setup(): Promise<void> {
    try {
      if (this.stateManager.getState().state !== AudioServiceState.UNINITIALIZED) {
        await this.cleanup();
      }

      this.stateManager.transition(AudioServiceEvent.INITIALIZE);

      if (typeof window === 'undefined') {
        throw new Error('Audio is only supported in browser environments');
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported in this environment');
      }

      this.audioContext = new AudioContextClass();

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

  async startRecording(sessionId: string): Promise<void> {
    try {
      if (!this.mediaStream || !this.audioContext) {
        throw new Error('Audio service not initialized');
      }

      if (this.stateManager.getState().state === AudioServiceState.RECORDING) {
        throw new Error('Already recording');
      }

      this.audioChunks = [];
      this.currentSession = {
        id: sessionId,
        startTime: Date.now(),
        duration: 0,
        audioData: new Float32Array()
      };

      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.stateManager.transition(AudioServiceEvent.RECORDING_START);
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

  async stopRecording(sessionId: string): Promise<RecordingResult> {
    try {
      if (!this.mediaRecorder || !this.currentSession || this.currentSession.id !== sessionId) {
        throw new Error('No active recording session');
      }

      return new Promise((resolve, reject) => {
        this.mediaRecorder!.onstop = async () => {
          try {
            const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            const audioData = audioBuffer.getChannelData(0);

            const duration = Date.now() - this.currentSession!.startTime;
            const result: RecordingResult = {
              id: sessionId,
              startTime: this.currentSession!.startTime,
              audioData,
              duration
            };

            this.stateManager.transition(AudioServiceEvent.RECORDING_STOP);
            this.currentSession = null;
            this.audioChunks = [];

            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        this.mediaRecorder!.stop();
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

  async initializeTTS(sessionId: string, userRole: string): Promise<void> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio service not initialized');
      }

      // In a real implementation, this would initialize the TTS service
      // with the appropriate voice for the user's role
      console.log(`Initializing TTS for session ${sessionId} with role ${userRole}`);
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.TTS_INITIALIZATION_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

  async processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio service not initialized');
      }

      const state = this.stateManager.getState();
      if (state.state !== AudioServiceState.RECORDING) {
        throw new Error('Audio service not in recording state');
      }

      // Process the chunk through VAD if enabled
      if (state.context.vadEnabled && this.vadService) {
        // VAD service processes audio automatically through its audio processor
        // We just need to check the current state
        const vadState = state.vad;
        return vadState?.speaking ?? true;
      }

      return true;
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.PROCESSING_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

  async generateSpeech(params: TTSParams): Promise<Float32Array> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio service not initialized');
      }

      // Create a temporary buffer for the generated speech
      const sampleRate = this.audioContext.sampleRate;
      const duration = 2; // Default duration in seconds
      const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Generate a simple sine wave as a placeholder
      // In a real implementation, this would call the TTS service
      const frequency = 440; // A4 note
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }

      return channelData;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.TTS_INITIALIZATION_FAILED, {
          originalError: error instanceof Error ? error : new Error(String(error))
        })
      });
      throw error;
    }
  }

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
      this.currentSession = null;
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

  getState(): AudioServiceStateData {
    return this.stateManager.getState();
  }
}

/**
 * Singleton instance of the audio service
 */
export const AudioService = AudioServiceImpl.getInstance();
