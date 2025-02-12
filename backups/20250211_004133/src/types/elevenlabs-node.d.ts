declare module 'elevenlabs-node' {
  interface TTSOptions {
    text: string;
    voice_id: string;
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
    speed?: number;
  }

  interface ElevenLabsConfig {
    apiKey: string;
  }

  export class ElevenLabs {
    constructor(config: ElevenLabsConfig);
    textToSpeech(options: TTSOptions): Promise<ArrayBuffer>;
    getVoices(): Promise<Array<{
      voice_id: string;
      name: string;
      preview_url: string;
      labels?: Record<string, string>;
    }>>;
  }
}
