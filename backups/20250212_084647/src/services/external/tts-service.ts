import { Service, ServiceError } from '../service-integration';
import {
  ExternalService,
  ExternalServiceConfig,
  ExternalServiceMetrics,
  TTSRequest,
  TTSResponse,
  TTSServiceType,
  TTSMetrics
} from './types';

/**
 * Implementation of the TTS service
 */
export class TTSService implements Service {
  [key: string]: unknown;

  private apiKey: string | null = null;
  private isConnected = false;
  private metrics: TTSMetrics = {
    requestCount: 0,
    errorCount: 0,
    averageLatency: 0,
    totalLatency: 0
  };

  async initialize(dependencies: Record<string, Service>): Promise<void> {
    const config = dependencies.config as { settings?: { apiKey?: string } };
    const apiKey = config?.settings?.apiKey;
    if (!apiKey) {
      throw new ServiceError('INVALID_API_KEY', 'API key is required');
    }
    this.apiKey = apiKey;
    this.isConnected = true;
  }

  async synthesize(text: string): Promise<TTSResponse> {
    if (!this.isConnected || !this.apiKey) {
      this.metrics.errorCount++;
      throw new ServiceError('NOT_CONNECTED', 'TTS service not connected');
    }

    if (!text || typeof text !== 'string') {
      this.metrics.errorCount++;
      throw new ServiceError('INVALID_INPUT', 'Invalid text input');
    }

    const startTime = Date.now();

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioData = await response.arrayBuffer();
      const endTime = Date.now();
      const latency = endTime - startTime;

      // Update metrics
      this.metrics.requestCount++;
      this.metrics.totalLatency += latency;
      this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.requestCount;

      return {
        audioData,
        duration: latency,
        format: 'audio/mpeg'
      };
    } catch (error) {
      this.metrics.errorCount++;
      if (error instanceof Error) {
        throw new ServiceError('SYNTHESIS_ERROR', `TTS synthesis failed: ${error.message}`);
      }
      throw new ServiceError('SYNTHESIS_ERROR', 'TTS synthesis failed');
    }
  }

  getMetrics(): TTSMetrics {
    return { ...this.metrics };
  }

  async dispose(): Promise<void> {
    this.isConnected = false;
    this.apiKey = null;
  }
}
