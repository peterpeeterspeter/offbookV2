export const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'disgust',
  'neutral'
] as const

export type Emotion = typeof EMOTIONS[number]

export interface Voice {
  voice_id: string
  name: string
  category: 'premade' | 'cloned'
  description?: string
  preview_url?: string
  labels?: Record<string, string>
}

export interface EmotionSuggestion {
  text: string
  emotion: Emotion
  confidence: number
  intensity: number
}

export interface EmotionTag {
  text: string
  emotion: Emotion
  intensity: number
  start: number
  end: number
}

export interface TTSOptions {
  emotion: Emotion
  intensity: number
  stability?: number
  similarity_boost?: number
  style?: number
  voiceId?: string
}

export interface TTSCacheEntry {
  audioUrl: string
  timestamp: number
  useCount: number
  emotion: Emotion
  intensity: number
  voiceId: string
} 