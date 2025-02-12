import type { Emotion } from '../components/EmotionHighlighter'
import type { TTSParams } from '../types/audio'

interface StreamManager {
  cleanup(): void;
  recordError(): void;
  resetMetrics(): void;
}

const streamManager: StreamManager = {
  cleanup() {
    // Implementation
  },
  recordError() {
    // Implementation
  },
  resetMetrics() {
    // Implementation
  }
}

interface VoiceStats {
  emotionFit: number;
  useCount: number;
  lastUsed: number;
  errorRate: number;
}

class VoiceSelector {
  private readonly defaultVoice = 'adam'
  private readonly emotionProfiles = new Map<Emotion, readonly string[]>([
    ['joy', ['rachel', 'bella', 'antoni'] as const],
    ['sadness', ['james', 'emily', 'elli'] as const],
    ['anger', ['josh', 'sam', 'thomas'] as const],
    ['fear', ['michael', 'charlotte', 'grace'] as const],
    ['surprise', ['daniel', 'sophia', 'oliver'] as const],
    ['neutral', ['adam', 'emma', 'david'] as const]
  ])

  private voiceScores = new Map<string, VoiceStats>()

  selectVoice(emotion: Emotion): string {
    const candidates = this.emotionProfiles.get(emotion)
    if (!candidates || candidates.length === 0) {
      return this.defaultVoice
    }
    return candidates[0] as string
  }

  updateVoiceStats(voiceId: string, success: boolean, emotionFit: number): void {
    const stats = this.voiceScores.get(voiceId) || {
      emotionFit: 0,
      useCount: 0,
      lastUsed: 0,
      errorRate: 0
    }

    stats.useCount++
    stats.lastUsed = Date.now()
    stats.emotionFit = (stats.emotionFit * (stats.useCount - 1) + emotionFit) / stats.useCount
    if (!success) {
      stats.errorRate = (stats.errorRate * (stats.useCount - 1) + 1) / stats.useCount
    }

    this.voiceScores.set(voiceId, stats)
  }
}

const voiceSelector = new VoiceSelector()

export async function synthesizeSpeech(
  text: string,
  emotion: Emotion = 'neutral',
  options: Partial<TTSParams['settings']> = {}
): Promise<ReadableStream> {
  if (!process.env.REACT_APP_ELEVENLABS_API_KEY) {
    throw new Error('API key not configured')
  }

  const voiceSettings = getVoiceSettings(emotion)
  const finalOptions = {
    ...voiceSettings,
    ...options
  }

  try {
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
        voice_id: voiceSelector.selectVoice(emotion),
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
      const errorData = await response.json()
      throw new Error(`ElevenLabs API error: ${response.statusText}${errorData.detail ? ` - ${errorData.detail}` : ''}`)
    }

    if (!response.body) {
      streamManager.cleanup()
      throw new Error('No response body received')
    }

    // Create a TransformStream to handle the audio data
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk)
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
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred during speech synthesis')
  }
}

function getVoiceSettings(emotion: Emotion): TTSParams['settings'] {
  const settings = {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0
  }

  switch (emotion) {
    case 'joy':
      settings.speed = 1.2
      settings.pitch = 1.1
      break
    case 'sadness':
      settings.speed = 0.8
      settings.pitch = 0.9
      break
    case 'anger':
      settings.speed = 1.3
      settings.pitch = 1.2
      break
    case 'fear':
      settings.speed = 1.1
      settings.pitch = 1.1
      break
    case 'surprise':
      settings.speed = 1.2
      settings.pitch = 1.2
      break
  }

  return settings
}

export function resetStreamingMetrics() {
  streamManager.resetMetrics()
}
