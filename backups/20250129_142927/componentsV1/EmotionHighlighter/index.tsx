import React, { forwardRef, useRef, useState, useEffect, useCallback } from 'react'
import type { HTMLAttributes, ChangeEvent, CSSProperties, ReactElement } from 'react'
import { detectEmotions } from '../../services/deepseek'
import { useCollaboration } from '../../contexts/CollaborationContext'
import { AudioPlayer } from '../AudioPlayer'
import { Emotion, EMOTIONS, EmotionTag, EmotionSuggestion } from '../../types'
import { SpeechInput } from '../SpeechInput'
import { timingService, TimingAdjustment, TimingMetrics, CadenceAnalysis } from '../../services/timing'

export interface EmotionHighlighterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  content: string
  onContentChange: (content: string) => void
  onSelect: (text: string, emotion: string, error?: string) => void
  className?: string
  style?: React.CSSProperties
  enableTTS?: boolean
  enableSTT?: boolean
  onTimingChange?: (delay: number) => void
}

interface PickerPosition {
  x: number
  y: number
}

const EMOTION_MODIFIERS = {
  sarcastic: { stability: 0.3, style: 0.8 },
  whispering: { stability: 0.9, style: 0.2 },
  shouting: { stability: 0.2, style: 0.9 },
  crying: { stability: 0.7, style: 0.4 },
  laughing: { stability: 0.4, style: 0.7 }
} as const

type EmotionModifier = keyof typeof EMOTION_MODIFIERS

const EMOTION_COLORS: Record<Emotion, string> = {
  angry: 'bg-red-100 text-red-800 border-red-300',
  calm: 'bg-blue-100 text-blue-800 border-blue-300',
  sad: 'bg-gray-100 text-gray-800 border-gray-300',
  happy: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sarcastic: 'bg-purple-100 text-purple-800 border-purple-300',
  whispering: 'bg-green-100 text-green-800 border-green-300',
}

const EmotionHighlighter = React.forwardRef<HTMLDivElement, EmotionHighlighterProps>(({
  content,
  onContentChange,
  onSelect,
  className,
  style,
  enableTTS = false,
  enableSTT = false,
  onTimingChange,
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tags, setTags] = useState<EmotionTag[]>([])
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('neutral')
  const [selectedIntensity, setSelectedIntensity] = useState<number>(5)
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<PickerPosition>({ x: 0, y: 0 })
  const [suggestions, setSuggestions] = useState<EmotionSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedText, setSelectedText] = useState<{
    text: string
    emotion: Emotion
    intensity: number
  } | null>(null)
  const [selectedModifier, setSelectedModifier] = useState<EmotionModifier | null>(null)
  const [timingMetrics, setTimingMetrics] = useState<TimingMetrics>({
    lastInteractionTime: Date.now(),
    averageDelay: 0,
    hesitationCount: 0,
    totalInteractions: 0,
    emotionTimings: new Map()
  })
  const [timingAdjustment, setTimingAdjustment] = useState<TimingAdjustment | null>(null)
  const lastInteractionTime = useRef<number>(0)
  const lastSpeechText = useRef<string>('')

  const { 
    isConnected, 
    collaborators, 
    updateContent, 
    updateEmotion, 
    updateCursor, 
    updateSelection,
    canEdit 
  } = useCollaboration()

  // Handle remote content updates
  useEffect(() => {
    const handleRemoteContentUpdate = (event: CustomEvent<{ content: string }>) => {
      onContentChange(event.detail.content)
    }

    document.addEventListener('remote_content_update', handleRemoteContentUpdate as EventListener)
    return () => {
      document.removeEventListener('remote_content_update', handleRemoteContentUpdate as EventListener)
    }
  }, [onContentChange])

  // Handle remote emotion updates
  useEffect(() => {
    const handleRemoteEmotionUpdate = (event: CustomEvent<{ text: string, emotion: Emotion, intensity: number }>) => {
      const { text, emotion, intensity } = event.detail
      onSelect(text, emotion)
      setSelectedText({ text, emotion, intensity })
    }

    document.addEventListener('remote_emotion_update', handleRemoteEmotionUpdate as EventListener)
    return () => {
      document.removeEventListener('remote_emotion_update', handleRemoteEmotionUpdate as EventListener)
    }
  }, [onSelect])

  // Handle input changes
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!canEdit) return
    const newContent = e.currentTarget.textContent || ''
    onContentChange(newContent)
    if (isConnected) {
      updateContent(newContent)
    }
  }, [canEdit, onContentChange, isConnected, updateContent])

  // Parse existing emotion tags from content
  useEffect(() => {
    const tagRegex = /\{([^}]+)\}/g
    const matches = Array.from(content.matchAll(tagRegex)) as RegExpMatchArray[]
    const parsedTags: EmotionTag[] = []

    matches.forEach(match => {
      const [fullMatch, tagContent] = match
      const [text, emotion, intensity] = tagContent?.split('|') || []
      if (text && emotion && intensity) {
        parsedTags.push({
          text,
          emotion,
          intensity: parseInt(intensity, 10),
          start: match.index!,
          end: match.index! + fullMatch.length,
        })
      }
    })

    setTags(parsedTags)
  }, [content])

  // Get emotion suggestions when content changes
  useEffect(() => {
    const getSuggestions = async () => {
      setIsAnalyzing(true)
      try {
        const response = await detectEmotions(content)
        if (response.error) {
          console.error('Error detecting emotions:', response.error)
          onSelect(content, 'neutral', response.error)
          return
        }
        setSuggestions(response.suggestions)
      } catch (error) {
        console.error('Failed to get emotion suggestions:', error)
        onSelect(content, 'neutral', 'Failed to analyze emotions')
      } finally {
        setIsAnalyzing(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      getSuggestions()
      if (isConnected) {
        updateContent(content)
      }
    }, 500)
    
    return () => clearTimeout(debounceTimer)
  }, [content, onSelect, isConnected, updateContent])

  // Handle text selection with timing
  const handleMouseUp = useCallback((e: MouseEvent): void => {
    if (!canEdit) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowEmotionPicker(false)
      setSelectedText(null)
      return
    }

    const range = selection.getRangeAt(0)
    const text = range.toString().trim()
    if (!text) {
      setSelectedText(null)
      return
    }

    // Show emotion picker near the selection
    const rect = range.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    })
    setShowEmotionPicker(true)

    // Update cursor position and selection for collaboration
    if (isConnected) {
      updateCursor(range.startOffset)
      updateSelection(range.startOffset, range.endOffset)
    }

    // Record timing of this interaction with text
    const now = Date.now()
    if (lastInteractionTime.current > 0) {
      timingService.recordInteraction(now, selectedEmotion, text)
    }
    lastInteractionTime.current = now

    // Get timing adjustment suggestion
    const adjustment = timingService.getTimingAdjustment(selectedEmotion)
    setTimingAdjustment(adjustment)

    // Notify parent of timing change
    if (onTimingChange && adjustment.suggestedDelay) {
      onTimingChange(adjustment.suggestedDelay)
    }
  }, [canEdit, isConnected, updateCursor, updateSelection, selectedEmotion, onTimingChange])

  // Handle emotion selection
  const handleEmotionSelect = useCallback((emotion: Emotion, intensity: number = 5) => {
    if (!canEdit) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (!text) return

    setSelectedText({ text, emotion, intensity })
    onSelect(text, emotion)
    if (isConnected) {
      updateEmotion(text, emotion, intensity)
    }
    setShowEmotionPicker(false)

    // Clear selection
    selection.removeAllRanges()

    // Record timing of this interaction
    const now = Date.now()
    if (lastInteractionTime.current > 0) {
      timingService.recordInteraction(now, emotion)
    }
    lastInteractionTime.current = now

    // Get timing adjustment suggestion
    const adjustment = timingService.getTimingAdjustment(emotion)
    setTimingAdjustment(adjustment)
  }, [canEdit, onSelect, isConnected, updateEmotion])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('mouseup', handleMouseUp)
    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseUp])

  // Apply emotion tag to selected text
  const applyEmotion = useCallback((): void => {
    if (!canEdit) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    const text = range.toString().trim()
    if (!text) return

    // Create new tag
    const newTag: EmotionTag = {
      text,
      emotion: selectedEmotion,
      intensity: selectedIntensity,
      start: range.startOffset,
      end: range.endOffset,
    }

    // Update content with new tag
    const updatedContent = content.slice(0, newTag.start) +
      `{${text}|${selectedEmotion}|${selectedIntensity}}` +
      content.slice(newTag.end)

    onContentChange(updatedContent)
    onSelect(text, selectedEmotion, undefined)

    // Notify collaborators
    if (isConnected) {
      updateContent(updatedContent)
      updateEmotion(text, selectedEmotion, selectedIntensity)
    }

    setShowEmotionPicker(false)
    selection.removeAllRanges()

    // Record timing of this interaction
    const now = Date.now()
    if (lastInteractionTime.current > 0) {
      timingService.recordInteraction(now, selectedEmotion)
    }
    lastInteractionTime.current = now

    // Get timing adjustment suggestion
    const adjustment = timingService.getTimingAdjustment(selectedEmotion)
    setTimingAdjustment(adjustment)
  }, [canEdit, content, selectedEmotion, selectedIntensity, onContentChange, onSelect, isConnected, updateContent, updateEmotion])

  // Render collaborator cursors and selections
  const renderCollaborators = useCallback((): ReactElement[] => {
    return Array.from(collaborators.entries()).map(([userId, data]) => (
      <React.Fragment key={userId}>
        {/* Cursor */}
        {data.cursor !== undefined && (
          <div
            className="absolute w-0.5 h-5 bg-indigo-500 animate-pulse"
            style={{
              left: `${data.cursor}ch`,
              top: 0,
            }}
          >
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-indigo-500 text-white text-xs rounded whitespace-nowrap">
              {data.username}
            </div>
          </div>
        )}
        {/* Selection */}
        {data.selection && (
          <div
            className="absolute bg-indigo-200 opacity-30"
            style={{
              left: `${data.selection.start}ch`,
              width: `${data.selection.end - data.selection.start}ch`,
              height: '1.2em',
            }}
          />
        )}
      </React.Fragment>
    ))
  }, [collaborators])

  return (
    <div
      ref={containerRef}
      className={`relative whitespace-pre-wrap ${className || ''} ${!canEdit ? 'cursor-not-allowed opacity-75' : ''}`}
      style={style}
      {...props}
    >
      <div 
        contentEditable={canEdit}
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={handleInput}
        className="min-h-[100px] p-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Add SpeechInput component */}
      {canEdit && enableSTT && (
        <div className="mt-4">
          <SpeechInput
            onTranscriptionComplete={(text) => {
              const newContent = content + (content ? '\n' : '') + text
              onContentChange(newContent)
              if (isConnected) {
                updateContent(newContent)
              }
            }}
            onError={(error) => onSelect('', 'neutral', error)}
            className="mb-4"
          />
        </div>
      )}

      {showEmotionPicker && pickerPosition && canEdit && (
        <div
          className="fixed z-50 p-4 bg-white rounded-lg shadow-lg border"
          style={{
            left: `${pickerPosition.x}px`,
            top: `${pickerPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {EMOTIONS.map((emotion: Emotion) => (
                <button
                  key={emotion}
                  onClick={() => handleEmotionSelect(emotion)}
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
                  onClick={() => setSelectedModifier(prev => prev === modifier as EmotionModifier ? null : modifier as EmotionModifier)}
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
                value={selectedIntensity}
                onChange={(e) => setSelectedIntensity(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm">{selectedIntensity}</span>
            </div>

            {timingAdjustment && (
              <div className="text-sm text-gray-600">
                <p>Suggested delay: {Math.round(timingAdjustment.suggestedDelay)}ms</p>
                <p>Confidence: {Math.round(timingAdjustment.confidence * 100)}%</p>
                <p>Based on: {timingAdjustment.reason}</p>
                
                {timingAdjustment.reason === 'hesitation' && (
                  <p className="text-yellow-600">Detected hesitation - taking more time</p>
                )}
                
                {timingAdjustment.reason === 'cadence' && timingAdjustment.cadenceMetrics && (
                  <div className="mt-2 text-xs">
                    <p>Speaking rate: {Math.round(timingAdjustment.cadenceMetrics.wordsPerMinute)} WPM</p>
                    <p>Pause frequency: {timingAdjustment.cadenceMetrics.pauseFrequency.toFixed(2)} pauses/word</p>
                    <div className="mt-1">
                      <p className="font-medium">Suggested pauses:</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {Array.from(timingAdjustment.cadenceMetrics.suggestedPauses.entries()).map(([emotion, pause]) => (
                          <div key={emotion} className="flex justify-between">
                            <span>{emotion}:</span>
                            <span>{Math.round(pause)}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {timingMetrics.totalInteractions > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Total interactions: {timingMetrics.totalInteractions}</p>
                    <p>Average delay: {Math.round(timingMetrics.averageDelay)}ms</p>
                    <p>Hesitations: {timingMetrics.hesitationCount}</p>
                  </div>
                )}
              </div>
            )}

            {enableTTS && selectedText && (
              <AudioPlayer
                text={selectedText.text}
                emotion={selectedText.emotion}
                intensity={selectedText.intensity}
                modifier={selectedModifier ? EMOTION_MODIFIERS[selectedModifier] : undefined}
                onError={(error) => onSelect(selectedText.text, selectedText.emotion, error.message)}
              />
            )}

            {timingMetrics.totalInteractions > 0 && (
              <div className="text-xs text-gray-500">
                Average response time: {Math.round(timingMetrics.averageDelay)}ms
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render collaborator cursors and selections */}
      {isConnected && renderCollaborators()}

      {/* Role indicator */}
      {isConnected && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium">
          {canEdit ? (
            <span className="text-green-600">Editor</span>
          ) : (
            <span className="text-gray-600">Viewer</span>
          )}
        </div>
      )}
    </div>
  )
})

EmotionHighlighter.displayName = 'EmotionHighlighter'

// Helper function to get color for emotion
function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case 'joy':
      return '#ffd700'
    case 'sadness':
      return '#4169e1'
    case 'anger':
      return '#ff4500'
    case 'fear':
      return '#9932cc'
    case 'surprise':
      return '#00ff7f'
    case 'disgust':
      return '#8b4513'
    case 'neutral':
    default:
      return '#d3d3d3'
  }
} 