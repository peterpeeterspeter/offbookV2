import type { AudioServiceType } from "@/components/SceneFlow";
import { AudioStateManager } from './audio-state';
import type { AudioServiceStateData } from './audio-state';
import { AudioServiceState, AudioServiceEvent, AudioServiceError, AudioErrorCategory } from '@/types/audio';
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
  SceneProgression,
  AudioErrorDetails,
  VADState,
  AudioService
} from '@/types/audio';
import { VADService } from './vad-service';
import { createMockBlobAsync } from '../tests/mocks/browser-apis';
import { ServiceError } from './service-integration';

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
export class AudioServiceImpl implements AudioService {
  private static instance: AudioServiceImpl;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private stateManager: AudioStateManager;
  private vadService: VADService | null = null;
  private isCleaningUp = false;
  private currentSession: RecordingSession | null = null;
  private ttsInitialized = false;

  private constructor() {
    this.stateManager = AudioStateManager.getInstance();
    this.stateManager.restore();
    this.initializeState();
  }

  private initializeState(): void {
    this.stateManager.transition(AudioServiceEvent.INITIALIZE, {
      state: AudioServiceState.UNINITIALIZED,
      error: undefined,
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

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new ServiceError('INITIALIZATION_FAILED', 'AudioContext not supported in this environment');
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
        throw new ServiceError('INITIALIZATION_FAILED', 'Failed to access microphone');
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
          originalError: error instanceof Error ? error : new ServiceError('UNKNOWN_ERROR', String(error))
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

  async initializeTTS(sessionId: string, userRole: string): Promise<void> {
    if (this.ttsInitialized) {
      return;
    }

    try {
      await this.setup();
      this.ttsInitialized = true;
    } catch (error) {
      const errorDetails: AudioErrorDetails = {
        name: 'TTS Initialization',
        code: AudioServiceError.TTS_INITIALIZATION_FAILED,
        category: AudioErrorCategory.INITIALIZATION,
        message: error instanceof Error ? error.message : 'Failed to initialize TTS',
        retryable: true
      };
      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw error;
    }
  }

  async startRecording(sessionId: string): Promise<void> {
    try {
      if (!this.mediaStream || !this.audioContext) {
        await this.setup();
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

      this.stateManager.transition(AudioServiceEvent.RECORDING_START);

      if (this.mediaStream) {
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder.start();
      } else {
        throw new Error('Media stream not available');
      }
    } catch (error) {
      const errorDetails: AudioErrorDetails = {
        name: 'Recording Start',
        code: AudioServiceError.RECORDING_FAILED,
        category: AudioErrorCategory.RECORDING,
        message: error instanceof Error ? error.message : 'Failed to start recording',
        retryable: true
      };
      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw error;
    }
  }

  async stopRecording(sessionId: string): Promise<RecordingResult> {
    try {
      if (!this.mediaRecorder || !this.currentSession) {
        throw new Error('No active recording session');
      }

      this.mediaRecorder.stop();
      this.stateManager.transition(AudioServiceEvent.RECORDING_STOP);

      const audioData = await this.processRecordedAudio();
      const duration = Date.now() - this.currentSession.startTime;

      const result: RecordingResult = {
        id: sessionId,
        startTime: this.currentSession.startTime,
        audioData,
        duration
      };

      this.currentSession = null;
      return result;
    } catch (error) {
      const errorDetails: AudioErrorDetails = {
        name: 'Recording Stop',
        code: AudioServiceError.RECORDING_FAILED,
        category: AudioErrorCategory.RECORDING,
        message: error instanceof Error ? error.message : 'Failed to stop recording',
        retryable: true
      };
      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw error;
    }
  }

  async processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean> {
    try {
      const vadService = this.vadService;
      if (!vadService) {
        return false;
      }

      return new Promise<boolean>(async (resolve) => {
        const removeListener = vadService.addStateListener((state) => {
          removeListener();
          resolve(state.speaking);
        });

        await vadService.start();
      });
    } catch (error) {
      const errorDetails: AudioErrorDetails = {
        name: 'Audio Processing',
        code: AudioServiceError.PROCESSING_FAILED,
        category: AudioErrorCategory.PROCESSING,
        message: error instanceof Error ? error.message : 'Failed to process audio chunk',
        retryable: true
      };
      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw error;
    }
  }

  async generateSpeech(params: TTSParams): Promise<Float32Array> {
    try {
      // Mock implementation - replace with actual TTS service
      const audioData = new Float32Array(1024).fill(0);
      return audioData;
    } catch (error) {
      const errorDetails: AudioErrorDetails = {
        name: 'Speech Generation',
        code: AudioServiceError.PROCESSING_FAILED,
        category: AudioErrorCategory.PROCESSING,
        message: error instanceof Error ? error.message : 'Failed to generate speech',
        retryable: true
      };
      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw error;
    }
  }

  private async handleDataAvailable(event: BlobEvent): Promise<void> {
    if (event.data.size > 0) {
      this.audioChunks.push(event.data);
    }
  }

  private async processRecordedAudio(): Promise<Float32Array> {
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const audioData = await this.convertBlobToFloat32Array(blob);
    this.audioChunks = [];
    return audioData;
  }

  private async convertBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
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

  async transcribe(audioData: ArrayBuffer): Promise<{ text: string; confidence: number }> {
    try {
      const result = await fetch('https://api.whisper.ai/v1/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: audioData
      });

      if (!result.ok) {
        throw new ServiceError('TRANSCRIPTION_FAILED', 'Transcription request failed');
      }

      const data = await result.json();
      return {
        text: data.text,
        confidence: data.confidence
      };
    } catch (error) {
      throw new ServiceError('TRANSCRIPTION_FAILED', error instanceof Error ? error.message : 'Failed to transcribe audio');
    }
  }

  async detectEmotion(audioData: ArrayBuffer): Promise<{ type: string; confidence: number } | null> {
    try {
      const result = await fetch('https://api.emotion.ai/v1/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: audioData
      });

      if (!result.ok) {
        throw new ServiceError('EMOTION_DETECTION_FAILED', 'Emotion detection request failed');
      }

      const data = await result.json();
      return {
        type: data.emotion,
        confidence: data.confidence
      };
    } catch (error) {
      throw new ServiceError('EMOTION_DETECTION_FAILED', error instanceof Error ? error.message : 'Failed to detect emotion');
    }
  }
}

/**
 * Singleton instance of the audio service
 */
const audioServiceInstance = AudioServiceImpl.getInstance();
export { audioServiceInstance as AudioService };
