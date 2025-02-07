import React, { useEffect, useState, useCallback } from 'react'
import { Emotion } from '../types'
import { AudioPlayer } from './AudioPlayer'

interface EmotionHighlighterProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string
  onEmotionTagSelect?: (text: string, emotion: Emotion, intensity: number, error?: Error) => void
  enableTTS?: boolean
  onTimingChange?: (delay: number) => void
}

interface TimingMetrics {
  lastInteractionTime: number
  averageDelay: number
  interactions: number
}

const EMOTION_MODIFIERS = {
  sarcastic: { stability: 0.3, style: 0.8 },
  whispering: { stability: 0.9, style: 0.2 },
  shouting: { stability: 0.2, style: 0.9 },
  crying: { stability: 0.7, style: 0.4 },
  laughing: { stability: 0.4, style: 0.7 }
} as const

type EmotionModifier = keyof typeof EMOTION_MODIFIERS

const EmotionHighlighter: React.ForwardRefRenderFunction<HTMLDivElement, EmotionHighlighterProps> = (
  { content, onEmotionTagSelect, enableTTS = false, onTimingChange, ...props },
  ref
) => {
  const [selectedText, setSelectedText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('neutral')
  const [selectedModifier, setSelectedModifier] = useState<EmotionModifier | null>(null)
  const [intensity, setIntensity] = useState(5)
  const [showControls, setShowControls] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [timingMetrics, setTimingMetrics] = useState<TimingMetrics>({
    lastInteractionTime: Date.now(),
    averageDelay: 0,
    interactions: 0
  })

  const handleSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowControls(false)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setShowControls(false)
      return
    }

    const now = Date.now()
    const delay = now - timingMetrics.lastInteractionTime
    
    // Update timing metrics
    setTimingMetrics(prev => {
      const newAverage = (prev.averageDelay * prev.interactions + delay) / (prev.interactions + 1)
      return {
        lastInteractionTime: now,
        averageDelay: newAverage,
        interactions: prev.interactions + 1
      }
    })

    // Notify parent of timing change
    if (delay > 0) {
      onTimingChange?.(delay)
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    setSelectedText(text)
    setPosition({
      x: rect.left + (rect.width / 2),
      y: rect.bottom + window.scrollY
    })
    setShowControls(true)
  }, [timingMetrics, onTimingChange])

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection)
    return () => document.removeEventListener('mouseup', handleSelection)
  }, [handleSelection])

  const handleEmotionSelect = useCallback((emotion: Emotion) => {
    setSelectedEmotion(emotion)
    onEmotionTagSelect?.(selectedText, emotion, intensity)
  }, [selectedText, intensity, onEmotionTagSelect])

  const handleModifierSelect = useCallback((modifier: EmotionModifier) => {
    setSelectedModifier(prev => prev === modifier ? null : modifier)
  }, [])

  const handleIntensityChange = useCallback((value: number) => {
    setIntensity(value)
    onEmotionTagSelect?.(selectedText, selectedEmotion, value)
  }, [selectedText, selectedEmotion, onEmotionTagSelect])

  const handleAudioError = useCallback((error: Error) => {
    onEmotionTagSelect?.(selectedText, selectedEmotion, intensity, error)
  }, [selectedText, selectedEmotion, intensity, onEmotionTagSelect])

  return (
    <div ref={ref} {...props}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      
      {showControls && (
        <div
          className="fixed z-50 p-4 bg-white rounded-lg shadow-lg border"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'].map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => handleEmotionSelect(emotion as Emotion)}
                  className={`px-3 py-1 rounded ${
                    selectedEmotion === emotion
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {emotion}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {Object.keys(EMOTION_MODIFIERS).map((modifier) => (
                <button
                  key={modifier}
                  onClick={() => handleModifierSelect(modifier as EmotionModifier)}
                  className={`px-3 py-1 rounded ${
                    selectedModifier === modifier
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {modifier}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Intensity:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => handleIntensityChange(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm">{intensity}</span>
            </div>

            {enableTTS && (
              <AudioPlayer
                text={selectedText}
                emotion={selectedEmotion}
                intensity={intensity}
                modifier={selectedModifier ? EMOTION_MODIFIERS[selectedModifier] : undefined}
                onError={handleAudioError}
              />
            )}

            {timingMetrics.interactions > 0 && (
              <div className="text-xs text-gray-500">
                Average response time: {Math.round(timingMetrics.averageDelay)}ms
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const ForwardedEmotionHighlighter = React.forwardRef<HTMLDivElement, EmotionHighlighterProps>(EmotionHighlighter)
export { ForwardedEmotionHighlighter as EmotionHighlighter } 