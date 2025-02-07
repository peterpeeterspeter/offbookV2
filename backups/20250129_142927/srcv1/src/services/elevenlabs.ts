import { Emotion, Voice, TTSOptions, TTSCacheEntry, VoiceModifier } from '../types'

// Cache configuration
const CACHE_CONFIG = {
  maxEntries: 500,                    // Store up to 500 audio files
  ttl: 7 * 24 * 60 * 60 * 1000,      // 7 days TTL
  frequentUseTTL: 30 * 24 * 60 * 60 * 1000, // 30 days for frequent items
  frequentUseThreshold: 5,            // Number of uses to be considered frequent
  maxAudioSize: 5 * 1024 * 1024      // 5MB max size for cached audio
} as const

// Voice cache to avoid repeated API calls
let voiceList: Voice[] | null = null
let lastVoiceFetch = 0
const VOICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class TTSCache {
  private cache: Map<string, TTSCacheEntry>

  constructor() {
    this.loadCache()
  }

  private getCacheKey(text: string, options: TTSOptions): string {
    return `${text}|${options.emotion}|${options.intensity}|${options.voiceId || 'default'}|${JSON.stringify(options.modifier || {})}`
  }

  private loadCache(): void {
    try {
      const savedCache = localStorage.getItem('tts-cache')
      if (savedCache) {
        const entries = JSON.parse(savedCache)
        this.cache = new Map(entries)
        this.cleanExpiredEntries()
      } else {
        this.cache = new Map()
      }
    } catch (error) {
      console.warn('Failed to load TTS cache:', error)
      this.cache = new Map()
    }
  }

  private saveCache(): void {
    try {
      const entries = Array.from(this.cache.entries())
      localStorage.setItem('tts-cache', JSON.stringify(entries))
    } catch (error) {
      console.warn('Failed to save TTS cache:', error)
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.useCount >= CACHE_CONFIG.frequentUseThreshold
        ? CACHE_CONFIG.frequentUseTTL
        : CACHE_CONFIG.ttl

      if (now - entry.timestamp > ttl) {
        // Revoke the blob URL before removing from cache
        URL.revokeObjectURL(entry.audioUrl)
        this.cache.delete(key)
      }
    }
    this.saveCache()
  }

  get(text: string, options: TTSOptions): string | null {
    this.cleanExpiredEntries()
    const key = this.getCacheKey(text, options)
    const entry = this.cache.get(key)
    
    if (entry) {
      entry.useCount++
      entry.timestamp = Date.now() // Reset TTL on use
      this.saveCache()
      return entry.audioUrl
    }
    
    return null
  }

  set(text: string, options: TTSOptions, audioBlob: Blob): string {
    const key = this.getCacheKey(text, options)
    
    // Check size before caching
    if (audioBlob.size > CACHE_CONFIG.maxAudioSize) {
      console.warn('Audio file too large for caching')
      return URL.createObjectURL(audioBlob)
    }

    // Remove oldest entries if cache is full
    if (this.cache.size >= CACHE_CONFIG.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => (a.useCount || 0) - (b.useCount || 0))
      
      const [oldestKey, oldestEntry] = entries[0]
      URL.revokeObjectURL(oldestEntry.audioUrl)
      this.cache.delete(oldestKey)
    }

    const audioUrl = URL.createObjectURL(audioBlob)
    this.cache.set(key, {
      audioUrl,
      timestamp: Date.now(),
      useCount: 1,
      emotion: options.emotion,
      intensity: options.intensity,
      voiceId: options.voiceId || 'default'
    })

    this.saveCache()
    return audioUrl
  }

  clear(): void {
    // Revoke all blob URLs before clearing
    this.cache.forEach(entry => URL.revokeObjectURL(entry.audioUrl))
    this.cache.clear()
    this.saveCache()
  }
}

// Initialize cache
const ttsCache = new TTSCache()

// Fetch available voices
export async function getVoices(): Promise<Voice[]> {
  // Return cached voices if still valid
  if (voiceList && Date.now() - lastVoiceFetch < VOICE_CACHE_TTL) {
    return voiceList
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.REACT_APP_ELEVENLABS_API_KEY || ''
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`)
    }

    const data = await response.json()
    voiceList = data.voices
    lastVoiceFetch = Date.now()
    return voiceList || []
  } catch (error) {
    console.error('Error fetching voices:', error)
    throw error
  }
}

// Map emotions to voice settings
function getVoiceSettings(emotion: Emotion, intensity: number, modifier?: VoiceModifier): TTSOptions {
  const baseSettings: TTSOptions = {
    emotion,
    intensity,
    stability: modifier?.stability ?? 0.5,
    similarity_boost: 0.75,
    style: modifier?.style
  }

  if (!modifier) {
    switch (emotion) {
      case 'joy':
        return {
          ...baseSettings,
          stability: 0.3,
          style: Math.min(1, 0.5 + (intensity * 0.05))
        }
      case 'sadness':
        return {
          ...baseSettings,
          stability: 0.8,
          style: Math.max(0, 0.5 - (intensity * 0.05))
        }
      case 'anger':
        return {
          ...baseSettings,
          stability: 0.2,
          style: Math.min(1, 0.6 + (intensity * 0.04))
        }
      case 'fear':
        return {
          ...baseSettings,
          stability: 0.7,
          style: Math.max(0, 0.4 - (intensity * 0.03))
        }
      case 'surprise':
        return {
          ...baseSettings,
          stability: 0.4,
          style: 0.5 + (Math.random() * 0.2)
        }
      case 'disgust':
        return {
          ...baseSettings,
          stability: 0.6,
          style: Math.max(0, 0.3 - (intensity * 0.02))
        }
      case 'neutral':
      default:
        return baseSettings
    }
  }

  return baseSettings
}

export async function synthesizeSpeech(
  text: string,
  emotion: Emotion = 'neutral',
  intensity: number = 5,
  voiceId?: string,
  modifier?: VoiceModifier
): Promise<string> {
  if (!process.env.REACT_APP_ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Check cache first
  const options = { ...getVoiceSettings(emotion, intensity, modifier), voiceId }
  const cachedAudio = ttsCache.get(text, options)
  if (cachedAudio) {
    console.log('Using cached audio')
    return cachedAudio
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'default'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.REACT_APP_ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: options
      })
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    const audioBlob = await response.blob()
    return ttsCache.set(text, options, audioBlob)
  } catch (error) {
    console.error('Failed to synthesize speech:', error)
    throw error
  }
}

export function clearTTSCache(): void {
  ttsCache.clear()
} 