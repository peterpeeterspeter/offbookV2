/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NODE_ENV: string
  readonly NEXT_PUBLIC_DAILY_API_KEY: string
  readonly NEXT_PUBLIC_DAILY_DOMAIN: string
  readonly NEXT_PUBLIC_DAILY_ROOM_URL?: string
  readonly NEXT_PUBLIC_DEEPSEEK_API_KEY: string
  readonly NEXT_PUBLIC_DEEPSEEK_API_URL: string
  readonly NEXT_PUBLIC_ERROR_REPORTING_URL: string
  readonly NEXT_PUBLIC_ELEVENLABS_API_KEY?: string
  readonly NEXT_PUBLIC_AI_DEFAULT_TONE?: 'neutral' | 'intense'
  readonly NEXT_PUBLIC_AI_ENABLE_EMOTION_MODULATION?: string
  readonly NEXT_PUBLIC_AI_EMOTION_INTENSITY?: string
  readonly NEXT_PUBLIC_AI_OFFLINE_MODE?: string
  readonly NEXT_PUBLIC_AI_WHISPER_MODEL?: string
  readonly NEXT_PUBLIC_AI_ENABLE_CACHE?: string
  readonly NEXT_PUBLIC_AI_MAX_CACHED_LINES?: string
  readonly NEXT_PUBLIC_AUDIO_SAMPLE_RATE?: string
  readonly NEXT_PUBLIC_VAD_THRESHOLD?: string
  readonly NEXT_PUBLIC_VAD_WINDOW_SIZE?: string
  readonly NEXT_PUBLIC_ENABLE_NOISE_SUPPRESSION?: string
  readonly NEXT_PUBLIC_ENABLE_ECHO_CANCELLATION?: string
  readonly NEXT_PUBLIC_ENABLE_AUTO_GAIN?: string
  readonly NEXT_PUBLIC_ICE_SERVERS?: string
  readonly NEXT_PUBLIC_ENABLE_METRICS?: string
  readonly NEXT_PUBLIC_METRICS_INTERVAL?: string
  readonly NEXT_PUBLIC_MAX_RECONNECT_ATTEMPTS?: string
  readonly NEXT_PUBLIC_RECONNECT_DELAY?: string
  readonly NEXT_PUBLIC_CACHE_DURATION?: string
  readonly NEXT_PUBLIC_CACHE_MAX_SIZE?: string
  readonly NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE?: string
  readonly NEXT_PUBLIC_ENABLE_PERFORMANCE_ANALYTICS?: string
  readonly NEXT_PUBLIC_ENABLE_EMOTION_DETECTION?: string
  readonly NEXT_PUBLIC_ENABLE_SCRIPT_ANALYSIS?: string
  readonly NEXT_PUBLIC_ENABLE_REALTIME_FEEDBACK?: string
  readonly NEXT_PUBLIC_ENABLE_OFFLINE_MODE?: string
  readonly NEXT_PUBLIC_ENABLE_COLLABORATION?: string
  readonly NEXT_PUBLIC_ENABLE_REALTIME_COLLAB?: string
  readonly NEXT_PUBLIC_COLLAB_SYNC_INTERVAL?: string
  readonly NEXT_PUBLIC_COLLAB_CAN_EDIT_EMOTIONS?: string
  readonly NEXT_PUBLIC_COLLAB_CAN_MODIFY_SCRIPT?: string
  readonly NEXT_PUBLIC_DEBUG_MODE?: string
  readonly NEXT_PUBLIC_DEBUG_AUDIO?: string
  readonly NEXT_PUBLIC_DEBUG_WEBRTC?: string
  readonly NEXT_PUBLIC_DEBUG_AI?: string
  readonly NEXT_PUBLIC_DEBUG_COLLAB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: { [key: string]: any };
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_DAILY_API_KEY: string;
    NEXT_PUBLIC_DAILY_DOMAIN: string;
    NEXT_PUBLIC_DAILY_ROOM_URL: string;
    NEXT_PUBLIC_DEEPSEEK_API_KEY: string;
    NEXT_PUBLIC_DEEPSEEK_API_URL: string;
    NEXT_PUBLIC_ERROR_REPORTING_URL: string;
    NEXT_PUBLIC_AUDIO_SAMPLE_RATE: string;
    NEXT_PUBLIC_VAD_THRESHOLD: string;
    NEXT_PUBLIC_VAD_WINDOW_SIZE: string;
    NEXT_PUBLIC_ENABLE_NOISE_SUPPRESSION: string;
    NEXT_PUBLIC_ENABLE_ECHO_CANCELLATION: string;
    NEXT_PUBLIC_ENABLE_AUTO_GAIN: string;
    NEXT_PUBLIC_ICE_SERVERS: string;
    NEXT_PUBLIC_ENABLE_METRICS: string;
    NEXT_PUBLIC_METRICS_INTERVAL: string;
    NEXT_PUBLIC_MAX_RECONNECT_ATTEMPTS: string;
    NEXT_PUBLIC_RECONNECT_DELAY: string;
    NEXT_PUBLIC_CACHE_DURATION: string;
    NEXT_PUBLIC_CACHE_MAX_SIZE: string;
    NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE: string;
    NEXT_PUBLIC_ENABLE_PERFORMANCE_ANALYTICS: string;
    NEXT_PUBLIC_ENABLE_EMOTION_DETECTION: string;
    NEXT_PUBLIC_ENABLE_SCRIPT_ANALYSIS: string;
    NEXT_PUBLIC_ENABLE_REALTIME_FEEDBACK: string;
    NEXT_PUBLIC_ENABLE_OFFLINE_MODE: string;
    NEXT_PUBLIC_ENABLE_COLLABORATION: string;
    NEXT_PUBLIC_ENABLE_REALTIME_COLLAB: string;
    NEXT_PUBLIC_COLLAB_SYNC_INTERVAL: string;
    NEXT_PUBLIC_COLLAB_CAN_EDIT_EMOTIONS: string;
    NEXT_PUBLIC_COLLAB_CAN_MODIFY_SCRIPT: string;
    NEXT_PUBLIC_DEBUG_MODE: string;
    NEXT_PUBLIC_DEBUG_AUDIO: string;
    NEXT_PUBLIC_DEBUG_WEBRTC: string;
    NEXT_PUBLIC_DEBUG_AI: string;
    NEXT_PUBLIC_DEBUG_COLLAB: string;
  }
}

export {};
