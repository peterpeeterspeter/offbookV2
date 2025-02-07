import React, { useEffect, useState } from 'react'
import { Emotion, Voice } from '../types'
import { getVoices, synthesizeSpeech } from '../services/elevenlabs'

interface AudioPlayerProps {
  text: string
  emotion: Emotion
  intensity: number
  onError?: (error: Error) => void
  onStart?: () => void
  onEnd?: () => void
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  emotion,
  intensity,
  onError,
  onStart,
  onEnd
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      setIsLoadingVoices(true)
      try {
        const availableVoices = await getVoices()
        setVoices(availableVoices)
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0])
        }
      } catch (error) {
        console.error('Failed to load voices:', error)
        onError?.(error as Error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    loadVoices()
  }, [onError])

  // Load audio when text, emotion, intensity, or selected voice changes
  useEffect(() => {
    const loadAudio = async () => {
      if (!text) return

      setIsLoading(true)
      try {
        const url = await synthesizeSpeech(
          text,
          emotion,
          intensity,
          selectedVoice?.voice_id
        )
        setAudioUrl(url)
      } catch (error) {
        console.error('Failed to load audio:', error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAudio()
  }, [text, emotion, intensity, selectedVoice, onError])

  const handlePlay = () => {
    onStart?.()
  }

  const handleEnded = () => {
    onEnd?.()
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg">
      <div className="flex items-center gap-4">
        <select
          className="p-2 border rounded-md"
          value={selectedVoice?.voice_id || ''}
          onChange={(e) => {
            const voice = voices.find(v => v.voice_id === e.target.value)
            setSelectedVoice(voice || null)
          }}
          disabled={isLoadingVoices}
        >
          {isLoadingVoices ? (
            <option>Loading voices...</option>
          ) : (
            voices.map(voice => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
              </option>
            ))
          )}
        </select>

        {isLoading ? (
          <div className="text-gray-600">Loading audio...</div>
        ) : audioUrl ? (
          <audio
            controls
            src={audioUrl}
            onPlay={handlePlay}
            onEnded={handleEnded}
            className="w-full"
          />
        ) : (
          <div className="text-gray-600">No audio available</div>
        )}
      </div>
    </div>
  )
} 