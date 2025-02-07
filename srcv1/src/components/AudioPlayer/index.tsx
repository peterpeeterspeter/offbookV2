import React, { useRef, useState, useEffect } from 'react'
import { Emotion } from '../../types'
import { synthesizeSpeech, getVoices } from '../../services/elevenlabs'
import type { Voice } from '../../types'

interface VoiceModifier {
  stability: number
  style: number
}

interface AudioPlayerProps {
  text: string
  emotion?: Emotion
  intensity?: number
  modifier?: VoiceModifier
  autoPlay?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  emotion = 'neutral',
  intensity = 5,
  modifier,
  autoPlay = false,
  onPlay,
  onPause,
  onEnd,
  onError
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>()
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoadingVoices(true)
        const availableVoices = await getVoices()
        setVoices(availableVoices)
        if (availableVoices.length > 0 && !selectedVoice) {
          setSelectedVoice(availableVoices[0].voice_id)
        }
      } catch (err) {
        console.error('Failed to load voices:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load voices'
        setError(errorMessage)
        onError?.(new Error(errorMessage))
      } finally {
        setIsLoadingVoices(false)
      }
    }

    loadVoices()
  }, [onError])

  // Load audio when text, emotion, intensity, voice, or modifier changes
  useEffect(() => {
    let mounted = true

    const loadAudio = async () => {
      if (!selectedVoice) return

      try {
        setIsLoading(true)
        setError(null)
        const url = await synthesizeSpeech(text, emotion, intensity, selectedVoice, modifier)
        if (mounted) {
          setAudioUrl(url)
          if (autoPlay && audioRef.current) {
            audioRef.current.play()
          }
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load audio'
          setError(errorMessage)
          onError?.(new Error(errorMessage))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadAudio()

    return () => {
      mounted = false
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [text, emotion, intensity, selectedVoice, modifier, autoPlay, onError])

  const handlePlay = () => {
    onPlay?.()
  }

  const handlePause = () => {
    onPause?.()
  }

  const handleEnded = () => {
    onEnd?.()
  }

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const errorMessage = 'Error playing audio'
    setError(errorMessage)
    onError?.(new Error(errorMessage))
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voice
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={isLoadingVoices}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {isLoadingVoices ? (
            <option>Loading voices...</option>
          ) : voices.length === 0 ? (
            <option>No voices available</option>
          ) : (
            voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} ({voice.category})
              </option>
            ))
          )}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
          <span className="text-sm text-gray-600">Loading audio...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">
          {error}
        </div>
      ) : audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          className="w-full max-w-md"
        />
      )}
    </div>
  )
}

export default AudioPlayer 