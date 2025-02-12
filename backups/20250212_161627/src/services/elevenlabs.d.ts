import { Emotion, TTSOptions, StreamingMetrics } from '../types';
export declare function getStreamingMetrics(): StreamingMetrics;
export declare function resetStreamingMetrics(): void;
export declare function synthesizeSpeech(text: string, emotion?: Emotion, options?: Partial<TTSOptions>): Promise<ReadableStream>;
