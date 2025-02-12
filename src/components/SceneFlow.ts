import type { RecordingResult } from '@/types/audio';

export interface AudioServiceType {
  setup(): Promise<void>;
  startRecording(sessionId: string): Promise<void>;
  stopRecording(sessionId: string): Promise<RecordingResult>;
  initializeTTS(sessionId: string, userRole: string): Promise<void>;
  processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean>;
  generateSpeech(params: TTSParams): Promise<Float32Array>;
}

export interface TTSParams {
  text: string;
  voice: string;
  settings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}
