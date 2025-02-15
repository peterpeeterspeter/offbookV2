import '@testing-library/jest-dom';

declare global {
  interface ProcessEnv {
    NEXT_PUBLIC_DEEPSEEK_API_KEY: string;
    NEXT_PUBLIC_ELEVENLABS_API_KEY: string;
    NEXT_PUBLIC_DAILY_API_KEY: string;
    NEXT_PUBLIC_DAILY_DOMAIN: string;
  }

  // Extend Window interface
  interface Window {
    ElevenLabs: ElevenLabsAPI;
    __FORCE_BATTERY_API__: boolean;
  }
}

interface ElevenLabsVoice {
  id: string;
  name: string;
}

interface ElevenLabsModel {
  id: string;
  name: string;
}

interface ElevenLabsAPI {
  synthesizeSpeech: (text: string, options?: any) => Promise<Uint8Array>;
  getVoices: () => Promise<ElevenLabsVoice[]>;
  getModels: () => Promise<ElevenLabsModel[]>;
}

export {};
