import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { detectEmotions } from "@/services/deepseek";
import { EmotionSuggestion } from "../services/types";
import { DeepSeekError } from "../services/errors";

interface EmotionHighlighterProps {
  content: string;
  onSelect?: (text: string, emotion?: string, intensity?: number) => void;
  onUpdate?: (content: string) => void;
  readOnly?: boolean;
}

interface EmotionTag {
  text: string;
  emotion: string;
  intensity: number;
  start: number;
  end: number;
}

const EMOTIONS = [
  "joy",
  "sadness",
  "anger",
  "fear",
  "surprise",
  "disgust",
  "neutral",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export function EmotionHighlighter({
  content,
  onSelect,
  onUpdate,
  readOnly = false,
}: EmotionHighlighterProps) {
  const [tags, setTags] = useState<EmotionTag[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>("neutral");
  const [selectedIntensity, setSelectedIntensity] = useState<number>(5);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedEmotions, setDetectedEmotions] = useState<EmotionSuggestion[]>(
    []
  );

  // Parse existing emotion tags from content
  useEffect(() => {
    const tagRegex = /\{([^}]+)\}/g;
    const matches = Array.from(
      content.matchAll(tagRegex)
    ) as Array<RegExpMatchArray>;
    const parsedTags: EmotionTag[] = [];

    matches.forEach((match) => {
      const [fullMatch, tagContent] = match as [string, string];
      const [text, emotion, intensity] = tagContent.split("|");
      if (text && emotion && intensity) {
        parsedTags.push({
          text,
          emotion,
          intensity: parseInt(intensity, 10),
          start: match.index!,
          end: match.index! + fullMatch.length,
        });
      }
    });

    setTags(parsedTags);
  }, [content]);

  // Handle text selection and emotion detection
  const handleMouseUp = useCallback(async (): Promise<void> => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowEmotionPicker(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) return;

    // Show emotion picker near the selection
    const rect = range.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    });

    // Analyze emotions in selected text
    setIsAnalyzing(true);
    setError(null);
    setDetectedEmotions([]);
    try {
      const result = await detectEmotions(text);
      if (result && result.suggestions) {
        setDetectedEmotions(result.suggestions);
      } else {
        setError("No emotions detected");
        setDetectedEmotions([]);
      }
    } catch (e) {
      console.error("Error detecting emotions:", e);
      if (e instanceof DeepSeekError) {
        setError(`DeepSeek API Error: ${e.message}`);
      } else if (e instanceof Error) {
        setError(`API Error: ${e.message}`);
      } else {
        setError("An unexpected error occurred while detecting emotions");
      }
      setDetectedEmotions([]);
    } finally {
      setIsAnalyzing(false);
      setShowEmotionPicker(true);
    }

    setSelection({
      text,
      start: range.startOffset,
      end: range.endOffset,
    });
  }, [readOnly]);

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  // Apply emotion tag to selected text
  const applyEmotion = useCallback((): void => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) return;

    // Create new tag
    const newTag: EmotionTag = {
      text,
      emotion: selectedEmotion,
      intensity: selectedIntensity,
      start: range.startOffset,
      end: range.endOffset,
    };

    // Update content with new tag
    const updatedContent =
      content.slice(0, newTag.start) +
      `{${text}|${selectedEmotion}|${selectedIntensity}}` +
      content.slice(newTag.end);

    onUpdate?.(updatedContent);
    onSelect?.(text, selectedEmotion, selectedIntensity);
    setShowEmotionPicker(false);
    selection.removeAllRanges();
  }, [content, selectedEmotion, selectedIntensity, onUpdate, onSelect]);

  // Render emotion picker
  const renderEmotionPicker = (): ReactNode => {
    if (!showEmotionPicker) return null;

    return (
      <div
        className="absolute z-50 bg-white rounded-lg shadow-lg p-4 border"
        style={{
          left: pickerPosition.x,
          top: pickerPosition.y + 10,
        }}
      >
        {isAnalyzing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span className="text-sm">Analyzing emotions...</span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Emotion</label>
              <div className="grid grid-cols-3 gap-2">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => setSelectedEmotion(emotion)}
                    className={`px-2 py-1 text-sm rounded ${
                      selectedEmotion === emotion
                        ? "bg-primary text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor:
                        selectedEmotion === emotion
                          ? getEmotionColor(emotion)
                          : undefined,
                    }}
                  >
                    {emotion}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Intensity ({selectedIntensity})
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={selectedIntensity}
                onChange={(e) => setSelectedIntensity(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowEmotionPicker(false);
                  setSelection(null);
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={applyEmotion}
                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render highlighted text
  const renderContent = (): ReactNode => {
    let lastIndex = 0;
    const elements: ReactNode[] = [];

    tags.forEach((tag: EmotionTag, index: number) => {
      // Add text before tag
      if (tag.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {content.slice(lastIndex, tag.start)}
          </span>
        );
      }

      // Add highlighted tag
      const emotionColor = getEmotionColor(tag.emotion);
      const opacity = tag.intensity / 10;
      elements.push(
        <span
          key={`tag-${index}`}
          className="rounded px-1"
          style={{
            backgroundColor: `${emotionColor}${Math.round(opacity * 255)
              .toString(16)
              .padStart(2, "0")}`,
          }}
          title={`${tag.emotion} (${tag.intensity})`}
        >
          {tag.text}
        </span>
      );

      lastIndex = tag.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(<span key="text-end">{content.slice(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <div
      ref={containerRef}
      className={`relative whitespace-pre-wrap ${
        readOnly ? "" : "cursor-text"
      }`}
    >
      {renderContent()}
      {renderEmotionPicker()}
    </div>
  );
}

// Helper function to get color for emotion
function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case "joy":
      return "#ffd700";
    case "sadness":
      return "#4169e1";
    case "anger":
      return "#ff4500";
    case "fear":
      return "#9932cc";
    case "surprise":
      return "#00ff7f";
    case "disgust":
      return "#8b4513";
    case "neutral":
    default:
      return "#d3d3d3";
  }
}

export const ForwardedEmotionHighlighter = React.forwardRef<
  HTMLDivElement,
  EmotionHighlighterProps
>(EmotionHighlighter);
ForwardedEmotionHighlighter.displayName = "ForwardedEmotionHighlighter";
