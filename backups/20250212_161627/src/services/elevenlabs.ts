import { Emotion, Voice, TTSOptions, TTSCacheEntry, VoiceModifier, StreamingMetrics } from '../types'
import { SimpleCache } from './cache'

// Stream manager for handling audio streams
class StreamManager {
  private metrics: StreamingMetrics = {
    activeStreams: 0,
    totalStreams: 0,
    errors: 0,
    dropoutCount: 0,
    avgLatency: 0,
    recoveryTime: 0
  }

  private voiceCache: SimpleCache

  constructor() {
    this.voiceCache = new SimpleCache(100, 1000 * 60 * 60) // 1 hour TTL
  }

  startStream(): ReadableStream {
    this.metrics.activeStreams++
    this.metrics.totalStreams++

    return new ReadableStream({
      start: (controller) => {
        // Stream initialization logic
      },
      cancel: () => {
        this.cleanup()
      }
    })
  }

  cleanup() {
    this.metrics.activeStreams--
  }

  recordError() {
    this.metrics.errors++
  }

  getMetrics(): StreamingMetrics {
    return { ...this.metrics }
  }

  resetMetrics() {
    this.metrics = {
      activeStreams: 0,
      totalStreams: 0,
      errors: 0,
      dropoutCount: 0,
      avgLatency: 0,
      recoveryTime: 0
    }
  }
}

// Voice selection optimization
class VoiceSelector {
  private emotionProfiles: Map<Emotion, string[]> = new Map([
    ['joy', ['rachel', 'bella', 'antoni']],
    ['sadness', ['james', 'emily', 'elli']],
    ['anger', ['josh', 'sam', 'thomas']],
    ['fear', ['grace', 'charlie', 'michael']],
    ['surprise', ['bella', 'antoni', 'rachel']],
    ['neutral', ['sam', 'emily', 'james']]
  ])

  private voiceScores: Map<string, {
    emotionFit: number
    useCount: number
    lastUsed: number
    errorRate: number
  }> = new Map()

  selectVoice(emotion: Emotion, intensity: number): string {
    const candidates = this.emotionProfiles.get(emotion) || []
    let bestVoice = candidates[0]
    let bestScore = -1

    for (const voiceId of candidates) {
      const stats = this.voiceScores.get(voiceId) || {
        emotionFit: 0.5,
        useCount: 0,
        lastUsed: 0,
        errorRate: 0
      }

      // Score based on multiple factors
      const score = (
        (stats.emotionFit * 0.4) +
        (1 - stats.errorRate) * 0.3 +
        (1 - stats.useCount / 1000) * 0.2 +
        (1 - (Date.now() - stats.lastUsed) / (24 * 60 * 60 * 1000)) * 0.1
      )

      if (score > bestScore) {
        bestScore = score
        bestVoice = voiceId
      }
    }

    // Update voice stats
    const stats = this.voiceScores.get(bestVoice) || {
      emotionFit: 0.5,
      useCount: 0,
      lastUsed: 0,
      errorRate: 0
    }
    stats.useCount++
    stats.lastUsed = Date.now()
    this.voiceScores.set(bestVoice, stats)

    return bestVoice
  }

  updateVoiceStats(voiceId: string, success: boolean, emotionFit: number) {
    const stats = this.voiceScores.get(voiceId) || {
      emotionFit: 0.5,
      useCount: 0,
      lastUsed: Date.now(),
      errorRate: 0
    }

    // Update error rate with decay
    const alpha = 0.1 // Learning rate
    stats.errorRate = stats.errorRate * (1 - alpha) + (success ? 0 : 1) * alpha
    stats.emotionFit = stats.emotionFit * (1 - alpha) + emotionFit * alpha

    this.voiceScores.set(voiceId, stats)
  }
}

const streamManager = new StreamManager()
const voiceSelector = new VoiceSelector()

// Voice settings mapping for emotions
function getVoiceSettings(emotion: Emotion, intensity: number = 5, modifier?: VoiceModifier): TTSOptions {
  const baseSettings: TTSOptions = {
    voice: {
      id: voiceSelector.selectVoice(emotion, intensity),
      name: '',
      accent: '',
      gender: '',
      age: 0
    },
    emotion,
    speed: 1.0,
    pitch: 1.0
  }

  if (!modifier) {
    switch (emotion) {
      case 'joy':
        return {
          ...baseSettings,
          speed: 1.2,
          pitch: 1.1
        }
      case 'sadness':
        return {
          ...baseSettings,
          speed: 0.8,
          pitch: 0.9
        }
      case 'anger':
        return {
          ...baseSettings,
          speed: 1.3,
          pitch: 1.2
        }
      case 'fear':
        return {
          ...baseSettings,
          speed: 1.1,
          pitch: 1.1
        }
      case 'surprise':
        return {
          ...baseSettings,
          speed: 1.2,
          pitch: 1.2
        }
      case 'neutral':
      default:
        return baseSettings
    }
  }

  return {
    ...baseSettings,
    speed: modifier.speed || baseSettings.speed,
    pitch: modifier.pitch || baseSettings.pitch
  }
}

export function getStreamingMetrics(): StreamingMetrics {
  return streamManager.getMetrics()
}

export function resetStreamingMetrics() {
  streamManager.resetMetrics()
}

export async function synthesizeSpeech(
  text: string,
  emotion: Emotion = 'neutral',
  options: Partial<TTSOptions> = {}
): Promise<ReadableStream> {
  if (!process.env.REACT_APP_ELEVENLABS_API_KEY) {
    throw new Error('API key not configured')
  }

  try {
    const voiceSettings = getVoiceSettings(emotion)
    const finalOptions = {
      ...voiceSettings,
      ...options
    }

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.REACT_APP_ELEVENLABS_API_KEY,
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
          ...finalOptions
        }
      })
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body received')
    }

    // Create a TransformStream to handle the audio data
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      flush(controller) {
        controller.terminate()
      }
    })

    const writer = writable.getWriter()
    const reader = response.body.getReader()

    // Start pumping data
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(value)
        }
      } catch (error) {
        streamManager.recordError()
        throw error
      } finally {
        writer.close()
      }
    }

    // Start the pump but don't wait for it
    pump().catch((error) => {
      console.error('Stream error:', error)
      writer.abort(error)
    })

    return readable

  } catch (error) {
    console.error('Speech synthesis error:', error)
    streamManager.cleanup()
    throw error
  }
}
