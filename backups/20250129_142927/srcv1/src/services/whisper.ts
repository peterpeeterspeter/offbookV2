import { Emotion } from '../types'
import { VAD } from './vad'

export interface WhisperResponse {
  text: string
  emotion?: Emotion
  confidence: number
  duration: number
}

export interface WhisperError {
  error: string
  code: string
}

// Cache for storing audio transcriptions
class TranscriptionCache {
  private cache: Map<string, { 
    result: WhisperResponse
    timestamp: number 
  }> = new Map()
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly MAX_ENTRIES = 100

  private getCacheKey(audio: Blob): string {
    // Simple hash function for audio data
    return audio.size.toString() + audio.type
  }

  get(audio: Blob): WhisperResponse | null {
    const key = this.getCacheKey(audio)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    // Check if cached result has expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return cached.result
  }

  set(audio: Blob, result: WhisperResponse): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(this.getCacheKey(audio), {
      result,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

const transcriptionCache = new TranscriptionCache()

// Function to record audio with VAD
export async function startRecording(): Promise<MediaRecorder> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    const audioChunks: Blob[] = []
    let isRecordingVoice = false
    let currentChunks: Blob[] = []
    
    // Create VAD instance
    const vad = new VAD({
      threshold: 15, // Adjust based on testing
      silenceTimeout: 1000, // Stop after 1 second of silence
      onSpeechStart: () => {
        isRecordingVoice = true
        currentChunks = []
      },
      onSpeechEnd: async () => {
        isRecordingVoice = false
        if (currentChunks.length > 0) {
          const audioBlob = new Blob(currentChunks, { type: 'audio/webm' })
          audioChunks.push(audioBlob)
        }
      }
    })

    // Start VAD
    await vad.start(stream)

    // Handle data available
    mediaRecorder.ondataavailable = (event) => {
      if (isRecordingVoice) {
        currentChunks.push(event.data)
      }
    }

    // Handle recording stop
    mediaRecorder.onstop = async () => {
      vad.stop()
      
      // Process any remaining audio
      if (currentChunks.length > 0) {
        const audioBlob = new Blob(currentChunks, { type: 'audio/webm' })
        audioChunks.push(audioBlob)
      }

      // Combine all audio chunks and transcribe
      if (audioChunks.length > 0) {
        const finalBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const result = await transcribeAudio(finalBlob)
        document.dispatchEvent(new CustomEvent('transcription_complete', {
          detail: result
        }))
      } else {
        document.dispatchEvent(new CustomEvent('transcription_complete', {
          detail: {
            error: 'No speech detected',
            code: 'NO_SPEECH'
          }
        }))
      }
    }

    // Set timeslice to 100ms for frequent updates
    mediaRecorder.start(100)
    return mediaRecorder

  } catch (error) {
    console.error('Error accessing microphone:', error)
    throw new Error('Failed to access microphone')
  }
}

// Function to transcribe audio using Whisper API
export async function transcribeAudio(audio: Blob): Promise<WhisperResponse | WhisperError> {
  // Check cache first
  const cached = transcriptionCache.get(audio)
  if (cached) {
    return cached
  }

  const formData = new FormData()
  formData.append('file', audio, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'json')
  formData.append('language', 'en')

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        error: error.error?.message || 'Failed to transcribe audio',
        code: error.error?.code || 'TRANSCRIPTION_ERROR'
      }
    }

    const result = await response.json()
    const transcription: WhisperResponse = {
      text: result.text,
      confidence: result.confidence || 0.8,
      duration: result.duration || 0
    }

    // Cache the result
    transcriptionCache.set(audio, transcription)

    return transcription
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return {
      error: 'Failed to transcribe audio',
      code: 'NETWORK_ERROR'
    }
  }
}

// Function to stop recording and clean up
export function stopRecording(mediaRecorder: MediaRecorder): void {
  if (mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    const tracks = mediaRecorder.stream.getTracks()
    tracks.forEach(track => track.stop())
  }
} 