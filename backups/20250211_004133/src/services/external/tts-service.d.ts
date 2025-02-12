import { Service } from '../service-integration';
import { TTSResponse, TTSMetrics } from './types';
/**
 * Implementation of the TTS service
 */
export declare class TTSService implements Service {
    [key: string]: unknown;
    private apiKey;
    private isConnected;
    private metrics;
    initialize(dependencies: Record<string, Service>): Promise<void>;
    synthesize(text: string): Promise<TTSResponse>;
    getMetrics(): TTSMetrics;
    dispose(): Promise<void>;
}
