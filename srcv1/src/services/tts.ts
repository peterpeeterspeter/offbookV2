import { Emotion } from '../types';

interface TTSOptions {
  emotion: Emotion | 'coaching';
  intensity: number;
}

export class TextToSpeechService {
  private audioContext: AudioContext;
  private cache: Map<string, AudioBuffer>;

  constructor() {
    this.audioContext = new AudioContext();
    this.cache = new Map();
  }

  async speak(text: string, options: TTSOptions): Promise<void> {
    const cacheKey = this.getCacheKey(text, options);
    
    try {
      let buffer = this.cache.get(cacheKey);
      
      if (!buffer) {
        const response = await this.fetchTTSAudio(text, options);
        buffer = await this.audioContext.decodeAudioData(await response.arrayBuffer());
        this.cache.set(cacheKey, buffer);
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }

  private getCacheKey(text: string, options: TTSOptions): string {
    return `${text}|${options.emotion || ''}|${options.intensity || ''}|${options.voice || ''}`;
  }

  private async fetchTTSAudio(text: string, options: TTSOptions): Promise<Response> {
    // Implementation will depend on your TTS provider (ElevenLabs, etc.)
    // This is a placeholder
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...options }),
    });
    
    if (!response.ok) {
      throw new Error('TTS API error');
    }
    
    return response;
  }
} 