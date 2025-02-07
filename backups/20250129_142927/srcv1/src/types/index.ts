export const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'disgust',
  'neutral'
] as const

export type Emotion = 'angry' | 'calm' | 'sad' | 'happy' | 'sarcastic' | 'whispering'

export interface EmotionTag {
  emotion: Emotion
  intensity?: number // 0-1
  text: string
  startIndex: number
  endIndex: number
}

export interface EmotionSuggestion {
  text: string
  emotion: Emotion
  intensity: number
  confidence: number
}

export interface Voice {
  voice_id: string
  name: string
  category: 'premade' | 'cloned'
  description?: string
  preview_url?: string
  labels?: Record<string, string>
}

export interface VoiceModifier {
  stability: number
  style: number
}

export interface TTSOptions {
  text: string
  emotion: Emotion
  intensity: number
  modifier?: VoiceModifier
}

export interface TTSCacheEntry {
  audio: ArrayBuffer
  timestamp: number
  options: TTSOptions
} 