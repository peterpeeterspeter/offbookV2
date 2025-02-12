import type { Service } from '@/types/core';
import type { TTSRequest, TTSMetrics } from '@/types/audio';
import { ServiceError } from '../service-integration';
import {
  ExternalService,
  ExternalServiceConfig,
  ExternalServiceMetrics,
  TTSResponse,
  TTSServiceType
} from './types';

export interface TTSService extends Service {
  initialize(dependencies: Record<string, Service>): Promise<void>;
  synthesize(text: string): Promise<ArrayBuffer>;
  getMetrics(): TTSMetrics;
  dispose(): Promise<void>;
  setup(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Implementation of the TTS service
 */
export class TTSServiceImpl implements TTSService {
  [key: string]: unknown;

  private apiKey: string | null = null;
  private isConnected = false;
  private isInitialized: boolean = false;
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';  // Default voice ID for testing
  private metrics: TTSMetrics = {
    requestId: '',
    timestamp: Date.now(),
    duration: 0,
    characters: 0,
    processingTime: 0,
    queueTime: 0,
    cacheHit: false
  };

  async setup(): Promise<void> {
    // Setup implementation
  }

  async cleanup(): Promise<void> {
    // Cleanup implementation
    await this.dispose();
  }

  async initialize(dependencies: Record<string, Service>): Promise<void> {
    const config = dependencies.config as { settings?: { apiKey?: string } };
    const apiKey = config?.settings?.apiKey;
    if (!apiKey) {
      throw new ServiceError('INVALID_API_KEY', 'API key is required');
    }
    this.apiKey = apiKey;
    this.isInitialized = true;
    this.isConnected = true;  // Set connected since we verified the API key
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const startTime = Date.now();

    // Update basic metrics before any validation
    this.metrics = {
      requestId: Math.random().toString(36).substring(7),
      timestamp: startTime,
      duration: 0,
      characters: text ? text.length : 0,
      processingTime: 0,
      queueTime: 0,
      cacheHit: false
    };

    if (!this.isInitialized) {
      throw new ServiceError('NOT_INITIALIZED', 'TTS service not initialized');
    }

    if (!this.isConnected || !this.apiKey) {
      throw new ServiceError('NOT_CONNECTED', 'TTS service not connected');
    }

    if (!text || typeof text !== 'string') {
      throw new ServiceError('INVALID_INPUT', 'Invalid text input');
    }

    const queueStartTime = Date.now();

    try {
      const processingStartTime = Date.now();
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.defaultVoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioData = await response.arrayBuffer();
      const endTime = Date.now();

      // Update metrics with timing information
      this.metrics = {
        ...this.metrics,
        duration: endTime - startTime,
        processingTime: endTime - processingStartTime,
        queueTime: processingStartTime - queueStartTime
      };

      return audioData;
    } catch (error) {
      // Update metrics with final duration
      const endTime = Date.now();
      this.metrics = {
        ...this.metrics,
        duration: endTime - startTime
      };
      throw new ServiceError('SYNTHESIS_ERROR', error instanceof Error ? error.message : 'Failed to synthesize speech');
    }
  }

  getMetrics(): TTSMetrics {
    return { ...this.metrics };
  }

  async dispose(): Promise<void> {
    this.isConnected = false;
    this.apiKey = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const ttsService = new TTSServiceImpl();
