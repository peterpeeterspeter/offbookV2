import { Emotion } from './index';
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
