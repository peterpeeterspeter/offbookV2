/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_API_URL: string
  readonly NODE_ENV: 'development' | 'production' | 'test'
  readonly VITE_DAILY_API_KEY: string
  readonly VITE_DAILY_DOMAIN: string
  readonly VITE_DAILY_ROOM_URL?: string
  readonly VITE_ELEVENLABS_API_KEY?: string
  readonly VITE_DEEPSEEK_API_KEY?: string
  readonly VITE_AI_DEFAULT_TONE?: 'neutral' | 'intense'
  readonly VITE_AI_ENABLE_EMOTION_MODULATION?: string
  readonly VITE_AI_EMOTION_INTENSITY?: string
  readonly VITE_AI_OFFLINE_MODE?: string
  readonly VITE_AI_WHISPER_MODEL?: string
  readonly VITE_AI_ENABLE_CACHE?: string
  readonly VITE_AI_MAX_CACHED_LINES?: string
  readonly VITE_AUDIO_SAMPLE_RATE?: string
  readonly VITE_VAD_THRESHOLD?: string
  readonly VITE_VAD_WINDOW_SIZE?: string
  readonly VITE_ENABLE_NOISE_SUPPRESSION?: string
  readonly VITE_ENABLE_ECHO_CANCELLATION?: string
  readonly VITE_ENABLE_AUTO_GAIN?: string
  readonly VITE_ICE_SERVERS?: string
  readonly VITE_ENABLE_METRICS?: string
  readonly VITE_METRICS_INTERVAL?: string
  readonly VITE_MAX_RECONNECT_ATTEMPTS?: string
  readonly VITE_RECONNECT_DELAY?: string
  readonly VITE_CACHE_DURATION?: string
  readonly VITE_CACHE_MAX_SIZE?: string
  readonly VITE_ENABLE_PERSISTENT_CACHE?: string
  readonly VITE_ENABLE_PERFORMANCE_ANALYTICS?: string
  readonly VITE_ENABLE_EMOTION_DETECTION?: string
  readonly VITE_ENABLE_SCRIPT_ANALYSIS?: string
  readonly VITE_ENABLE_REALTIME_FEEDBACK?: string
  readonly VITE_ENABLE_OFFLINE_MODE?: string
  readonly VITE_ENABLE_COLLABORATION?: string
  readonly VITE_ENABLE_REALTIME_COLLAB?: string
  readonly VITE_COLLAB_SYNC_INTERVAL?: string
  readonly VITE_COLLAB_CAN_EDIT_EMOTIONS?: string
  readonly VITE_COLLAB_CAN_MODIFY_SCRIPT?: string
  readonly VITE_DEBUG_MODE?: string
  readonly VITE_DEBUG_AUDIO?: string
  readonly VITE_DEBUG_WEBRTC?: string
  readonly VITE_DEBUG_AI?: string
  readonly VITE_DEBUG_COLLAB?: string
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
