import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface EmotionHighlighterProps {
  content: string
  onSelect?: (text: string, emotion?: string, intensity?: number) => void
  onUpdate?: (content: string) => void
  readOnly?: boolean
}

interface EmotionTag {
  text: string
  emotion: string
  intensity: number
  start: number
  end: number
}

const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'disgust',
  'neutral'
] as const

type Emotion = typeof EMOTIONS[number]

export const EmotionHighlighter = React.forwardRef<HTMLDivElement, EmotionHighlighterProps>(({
  content,
  onSelect,
  onUpdate,
  readOnly = false,
}, ref) => {
  const containerRef = ref || useRef<HTMLDivElement>(null)
  const [tags, setTags] = useState<EmotionTag[]>([])
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('neutral')
  const [selectedIntensity, setSelectedIntensity] = useState<number>(5)
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })

  // Parse existing emotion tags from content
  useEffect(() => {
    const tagRegex = /\{([^}]+)\}/g
    const matches = Array.from(content.matchAll(tagRegex)) as Array<RegExpMatchArray>
    const parsedTags: EmotionTag[] = []

    matches.forEach(match => {
      const [fullMatch, tagContent] = match as [string, string]
      const [text, emotion, intensity] = tagContent.split('|')
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

  // Handle text selection
  const handleMouseUp = useCallback((e: MouseEvent): void => {
    if (readOnly) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowEmotionPicker(false)
      return
    }

    const range = selection.getRangeAt(0)
    const text = range.toString().trim()
    if (!text) return

    // Show emotion picker near the selection
    const rect = range.getBoundingClientRect()
    setPickerPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    })
    setShowEmotionPicker(true)
  }, [readOnly])

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

    onUpdate?.(updatedContent)
    onSelect?.(text, selectedEmotion, selectedIntensity)
    setShowEmotionPicker(false)
    selection.removeAllRanges()
  }, [content, selectedEmotion, selectedIntensity, onUpdate, onSelect])

  // Render emotion picker
  const renderEmotionPicker = (): ReactNode => {
    if (!showEmotionPicker) return null

    return (
      <div
        className="absolute z-10 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
        style={{
          left: pickerPosition.x,
          top: pickerPosition.y,
        }}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Emotion
          </label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {EMOTIONS.map(emotion => (
              <button
                key={emotion}
                onClick={() => setSelectedEmotion(emotion)}
                className={`rounded-md px-3 py-2 text-sm ${
                  selectedEmotion === emotion
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Intensity (1-10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={selectedIntensity}
            onChange={e => setSelectedIntensity(parseInt(e.target.value, 10))}
            className="mt-1 w-full"
          />
          <div className="mt-1 text-center text-sm text-gray-600">
            {selectedIntensity}
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setShowEmotionPicker(false)}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={applyEmotion}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </div>
    )
  }

  // Render highlighted text
  const renderContent = (): ReactNode => {
    let lastIndex = 0
    const elements: ReactNode[] = []

    tags.forEach((tag: EmotionTag, index: number) => {
      // Add text before tag
      if (tag.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {content.slice(lastIndex, tag.start)}
          </span>
        )
      }

      // Add highlighted tag
      const emotionColor = getEmotionColor(tag.emotion)
      const opacity = tag.intensity / 10
      elements.push(
        <span
          key={`tag-${index}`}
          className="rounded px-1"
          style={{
            backgroundColor: `${emotionColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          title={`${tag.emotion} (${tag.intensity})`}
        >
          {tag.text}
        </span>
      )

      lastIndex = tag.end
    })

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key="text-end">
          {content.slice(lastIndex)}
        </span>
      )
    }

    return elements
  }

  return (
    <div
      ref={containerRef}
      className={`relative whitespace-pre-wrap ${readOnly ? '' : 'cursor-text'}`}
    >
      {renderContent()}
      {renderEmotionPicker()}
    </div>
  )
})

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