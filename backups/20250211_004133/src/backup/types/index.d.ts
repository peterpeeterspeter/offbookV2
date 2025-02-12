export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'neutral';
export interface Voice {
    id: string;
    name: string;
    settings: VoiceSettings;
    samples: AudioSample[];
    labels: Record<string, string>;
}
export interface VoiceSettings {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
}
export interface AudioSample {
    id: string;
    url: string;
    duration: number;
}
export interface TTSOptions {
    emotion: Emotion | 'coaching';
    intensity: number;
    voiceId?: string;
    modifier?: VoiceModifier;
    stability?: number;
    similarity_boost?: number;
    style?: number;
}
export interface VoiceModifier {
    stability?: number;
    style?: number;
}
export interface TTSCacheEntry {
    audioUrl: string;
    timestamp: number;
    useCount: number;
    emotion: Emotion | 'coaching';
    intensity: number;
    voiceId: string;
}
export interface StreamingMetrics {
    bufferUtilization: number;
    streamLatency: number;
    dropoutCount: number;
    recoveryTime: number;
    activeStreams: number;
    processingTime: number;
    networkLatency: number;
    adaptiveBufferSize: number;
    voiceChangeLatency: number;
    reconnectionCount: number;
    partialDataSize: number;
}
export interface PipelineMetrics {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    queueUtilization: number;
    batchEfficiency: number;
}
export interface PerformanceMetrics {
    pipeline: PipelineMetrics;
    cache: CacheMetrics;
}
export interface CacheMetrics {
    hitRate: number;
    totalRequests: number;
    averageLatency: number;
    frequentItemsRatio: number;
    uptime: number;
}
