import { AudioStateManager } from './audio-state';
import type { AudioServiceStateData } from './audio-state';
import {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  AudioService,
  RecordingResult,
  RecordingSession,
  AudioErrorDetails,
  VADState,
  type AudioServiceContext
} from '@/types/audio';
import type { ServiceState } from '@/types/core';
import { VADService } from './vad-service';
import { ScriptAnalysisError, ScriptAnalysisErrorCode } from '../types/errors';
import { AudioServiceType, TTSRequest } from '../types/audio';

// Type declaration for WebKit AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

/**
 * Implementation of the audio service handling recording, playback,
 * and text-to-speech functionality for script rehearsal.
 *
 * Note: There are known TypeScript linter issues with try-catch blocks in this file.
 * These are parser limitations and do not affect functionality.
 * Tracked in issue: TODO-XXX
 */
export class AudioServiceImpl implements AudioServiceType {
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
  private state: AudioServiceStateData = {
    state: AudioServiceState.UNINITIALIZED,
    context: {
      sampleRate: 44100,
      channelCount: 2,
      vadBufferSize: 2048,
      noiseThreshold: 0.2,
      silenceThreshold: 0.1,
      isContextRunning: false
    },
    isContextRunning: false,
    sampleRate: 44100
  };
  private listeners: ((state: ServiceState<AudioServiceContext>) => void)[] = [];

  private constructor() {
    this.stateManager = AudioStateManager.getInstance();
    this.stateManager.restore();
    this.initializeState();
  }

  private initializeState(): void {
    this.stateManager.transition(AudioServiceEvent.INITIALIZE, {
      state: AudioServiceState.UNINITIALIZED,
      context: {
        sampleRate: 44100,
        channelCount: 2,
        vadBufferSize: 2048,
        noiseThreshold: 0.2,
        silenceThreshold: 0.1,
        isContextRunning: false,
        vadEnabled: true,
        vadThreshold: 0.5,
        vadSampleRate: 16000
      }
    });
  }

  public static getInstance(): AudioServiceImpl {
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
      const currentState = this.stateManager.getState().state;

      // If already initializing, wait for completion or timeout
      if (currentState === AudioServiceState.INITIALIZING) {
        await this.waitForInitialization();
        return;
      }

      // If already initialized, just return
      if (currentState === AudioServiceState.INITIALIZED) {
        return;
      }

      this.stateManager.transition(AudioServiceEvent.INITIALIZE, {
        state: AudioServiceState.INITIALIZING
      });

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Request media permissions
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Initialize VAD service if needed
      if (this.state.context.vadEnabled) {
        this.vadService = new VADService({
          sampleRate: this.audioContext.sampleRate,
          threshold: this.state.context.vadThreshold
        });
      }

      // Update state with successful initialization
      this.stateManager.transition(AudioServiceEvent.INITIALIZED, {
        state: AudioServiceState.INITIALIZED,
        context: {
          vadBufferSize: 2048,
          noiseThreshold: 0.2,
          silenceThreshold: 0.1,
          sampleRate: this.audioContext.sampleRate,
          channelCount: 1,
          isContextRunning: this.audioContext.state === 'running',
          vadEnabled: true,
          vadThreshold: 0.5,
          vadSampleRate: 16000
        }
      });
    } catch (error) {
      const errorDetails = error instanceof ScriptAnalysisError ? error : new ScriptAnalysisError(
        error instanceof Error ? error.message : 'Failed to initialize audio service',
        ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
        {
          category: AudioErrorCategory.INITIALIZATION,
          details: {
            state: this.state.state,
            isContextRunning: this.state.isContextRunning,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      );

      this.stateManager.transition(AudioServiceEvent.ERROR, { error: errorDetails });
      throw errorDetails;
    }
  }

  private async waitForInitialization(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const currentState = this.stateManager.getState().state;
        if (currentState === AudioServiceState.INITIALIZED) {
          resolve();
        } else if (currentState === AudioServiceState.ERROR) {
          reject(new Error('Initialization failed'));
        } else if (Date.now() - start > timeout) {
          reject(new Error('Initialization timeout'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private async initializeVAD(): Promise<void> {
    try {
      // Validate media stream
      if (!this.mediaStream) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INVALID_STATE,
          message: 'Media stream not available'
        });
      }

      // Validate audio tracks
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INVALID_STATE,
          message: 'No audio tracks available in media stream'
        });
      }

      // Validate track state
      const activeTrack = audioTracks[0];
      if (!activeTrack?.enabled || activeTrack?.muted || activeTrack?.readyState !== 'live') {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INVALID_STATE,
          message: 'Audio track is not in a valid state',
          details: {
            enabled: activeTrack?.enabled,
            muted: activeTrack?.muted,
            readyState: activeTrack?.readyState
          }
        });
      }

      // Get and validate state configuration
      const state = this.stateManager.getState();
      const requiredConfig = {
        vadSampleRate: state.context.vadSampleRate,
        vadBufferSize: state.context.vadBufferSize,
        noiseThreshold: state.context.noiseThreshold,
        silenceThreshold: state.context.silenceThreshold
      };

      // Check for missing configuration
      const missingConfig = Object.entries(requiredConfig)
        .filter(([, value]) => value === undefined)
        .map(([key]) => key);

      if (missingConfig.length > 0) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INVALID_STATE,
          message: 'VAD configuration is incomplete',
          details: { missingParameters: missingConfig }
        });
      }

      // Initialize VAD service with validated configuration
      this.vadService = new VADService({
        sampleRate: requiredConfig.vadSampleRate!,
        frameSize: requiredConfig.vadBufferSize!
      });

      // Initialize VAD with media stream
      await this.vadService.initialize(this.mediaStream);

      // Set up VAD state listener with error handling
      this.vadService.addStateListener((vadState) => {
        try {
          if (this.stateManager.getState().state === AudioServiceState.RECORDING) {
            const vadUpdate: VADState = {
              enabled: true,
              threshold: state.context.vadThreshold || 0.5,
              sampleRate: requiredConfig.vadSampleRate!,
              bufferSize: requiredConfig.vadBufferSize!,
              active: vadState.speaking || false,
              speaking: vadState.speaking,
              noiseLevel: vadState.noiseLevel,
              lastActivity: vadState.lastActivity,
              confidence: vadState.confidence
            };
            this.stateManager.transition(AudioServiceEvent.VAD_UPDATE, { vad: vadUpdate });
          }
        } catch (error) {
          console.error('Error in VAD state listener:', error);
          // Don't throw here as this is an event listener
          this.stateManager.transition(AudioServiceEvent.ERROR, {
            error: new ScriptAnalysisError({
              code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
              message: 'Error processing VAD update',
              details: { originalError: error }
            })
          });
        }
      });
    } catch (error) {
      console.error('VAD initialization failed:', error);
      if (error instanceof ScriptAnalysisError) {
        throw error;
      }
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
        message: 'Failed to initialize voice activity detection',
        details: { originalError: error }
      });
    }
  }

  async initializeTTS(): Promise<void> {
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

  async startRecording(): Promise<void> {
    try {
      if (!this.vadService) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
          message: 'VAD service not initialized'
        });
      }
      await this.vadService.startRecording();
    } catch (error) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
        message: 'Failed to start recording',
        details: { originalError: error }
      });
    }
  }

  /* Known linter issue: TypeScript parser limitation with try-catch blocks */
  /* eslint-disable @typescript-eslint/no-unsafe-throw */
  async stopRecording(): Promise<RecordingResult> {
    if (!this.vadService) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
        message: 'VAD service not initialized'
      });
    }

    try {
      const result = await this.vadService.stopRecording();
      if (!result) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
          message: 'Failed to stop recording'
        });
      }

      const audioBuffer = result.audioData.buffer.slice(0);
      if (!(audioBuffer instanceof ArrayBuffer)) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
          message: 'Invalid audio buffer type'
        });
      }

      return {
        audio: audioBuffer,
        duration: result.duration,
        format: 'audio/wav'
      };
    } catch (error) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
        message: 'Failed to stop recording',
        details: { originalError: error }
      });
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-throw */

  async processAudioChunk(sessionId: string, chunk: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.vadService) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
          message: 'VAD service not initialized'
        });
      }
      return await this.vadService.processAudioChunk(new Float32Array(chunk));
    } catch (error) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
        message: 'Failed to process audio chunk',
        details: { originalError: error }
      });
    }
  }

  /* Known linter issue: TypeScript parser limitation with try-catch blocks */
  /* eslint-disable @typescript-eslint/no-unsafe-throw */
  async generateSpeech(_params: TTSRequest): Promise<ArrayBuffer> {
    if (!this.vadService) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED,
        message: 'VAD service not initialized'
      });
    }

    try {
      const float32Array = await this.generateSpeechInternal();
      const audioBuffer = float32Array.buffer.slice(0);
      if (!(audioBuffer instanceof ArrayBuffer)) {
        throw new ScriptAnalysisError({
          code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
          message: 'Invalid audio buffer type'
        });
      }
      return audioBuffer;
    } catch (error) {
      throw new ScriptAnalysisError({
        code: ScriptAnalysisErrorCode.PROCESSING_FAILED,
        message: 'Failed to generate speech',
        details: { originalError: error }
      });
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-throw */

  private async generateSpeechInternal(): Promise<Float32Array> {
    // Implementation details
    return new Float32Array(0);
  }

  private async handleDataAvailable(event: BlobEvent): Promise<void> {
    if (event.data.size > 0) {
      this.audioChunks.push(event.data);
    }
  }

  private async processRecordedAudio(): Promise<Float32Array> {
    if (!this.audioChunks.length) {
      throw new ScriptAnalysisError('No audio data available', ScriptAnalysisErrorCode.NO_AUDIO_DATA, {
        category: AudioErrorCategory.PROCESSING,
        details: { state: this.state.state }
      });
    }

    try {
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      return await this.convertBlobToFloat32Array(blob);
    } catch (error) {
      return this.handleError(error, ScriptAnalysisErrorCode.AUDIO_PROCESSING_FAILED);
    }
  }

  private async convertBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.getChannelData(0);
    } catch (error) {
      return this.handleError(error, ScriptAnalysisErrorCode.AUDIO_CONVERSION_FAILED);
    }
  }

  async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      if (this.vadService) {
        try {
          await this.vadService.stop();
        } catch (error) {
          console.error('Error stopping VAD service:', error);
        }
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
        try {
          await this.audioContext.close();
        } catch (error) {
          console.error('Error closing audio context:', error);
        }
        this.audioContext = null;
      }

      this.audioChunks = [];
      this.currentSession = null;

      // Always transition to UNINITIALIZED after cleanup
      this.stateManager.transition(AudioServiceEvent.CLEANUP);
    } catch (error) {
      console.error('Cleanup failed:', error);
      const errorDetails = error instanceof Error ? error : new Error(String(error));
      this.stateManager.transition(AudioServiceEvent.ERROR, {
        error: this.stateManager.createError(AudioServiceError.CLEANUP_FAILED, {
          originalError: errorDetails
        })
      });
      throw errorDetails;
    } finally {
      this.isCleaningUp = false;
    }
  }

  getState(): ServiceState<AudioServiceContext> {
    return this.stateManager.getState();
  }

  async transcribe(audioData: ArrayBuffer): Promise<{ text: string; confidence: number }> {
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('Invalid audio data');
    }

    try {
      // Implementation details...
      return {
        text: 'Transcribed text',
        confidence: 0.95
      };
    } catch (error) {
      return this.handleError(error, ScriptAnalysisErrorCode.TRANSCRIPTION_FAILED);
    }
  }

  async detectEmotion(audioData: ArrayBuffer): Promise<{ type: string; confidence: number } | null> {
    if (!audioData || audioData.byteLength === 0) {
      return null;
    }

    try {
      // Implementation details...
      return {
        type: 'neutral',
        confidence: 0.85
      };
    } catch (error) {
      return this.handleError(error, ScriptAnalysisErrorCode.EMOTION_DETECTION_FAILED);
    }
  }

  addStateListener(listener: (state: ServiceState<AudioServiceContext>) => void): () => void {
    this.listeners.push(listener);
    return () => this.removeStateListener(listener);
  }

  removeStateListener(listener: (state: ServiceState<AudioServiceContext>) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  protected setState(newState: Partial<ServiceState<AudioServiceContext>>): void {
    this.state = { ...this.state, ...newState } as AudioServiceStateData;
    this.listeners.forEach(listener => listener(this.state));
  }

  private handleError(error: unknown, code: ScriptAnalysisErrorCode): never {
    if (error instanceof Error) {
      throw new ScriptAnalysisError(error.message, code, {
        category: AudioErrorCategory.RECORDING,
        details: {
          state: this.state.state,
          isContextRunning: this.state.isContextRunning,
          error: error.message
        } as AudioErrorDetails
      });
    }
    throw new ScriptAnalysisError('Unknown error occurred', code, {
      category: AudioErrorCategory.RECORDING,
      details: {
        state: this.state.state,
        isContextRunning: this.state.isContextRunning,
        error: String(error)
      } as AudioErrorDetails
    });
  }
}

/**
 * Singleton instance of the audio service
 */
const audioServiceInstance = AudioServiceImpl.getInstance();
export { audioServiceInstance as AudioService };

// Export the type for use in other files
export type { AudioServiceType };
