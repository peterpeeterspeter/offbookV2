export interface TTSParams {
  text: string;
  voice: string;
  settings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}

export interface TTSResult {
  audioData: Float32Array;
  duration: number;
  metrics?: {
    processingTime: number;
    characterCount: number;
    wordCount: number;
  };
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  preview?: string;
  settings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}

export interface TTSError {
  code: string;
  message: string;
  details?: {
    voice?: string;
    text?: string;
    settings?: Record<string, unknown>;
  };
}
