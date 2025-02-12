import React, { useRef, useEffect, useState } from "react";
import { ScriptLine } from "./script-line";
import { Emotion } from "../../types";
import { cn } from "../../lib/utils";
import { PerformanceOverlay } from "./performance-overlay";
import { EmotionVisualizer } from "./emotion-visualizer";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { PracticeModeManager } from "./practice-mode-manager";

export interface ScriptLine {
  id: string;
  text: string;
  emotion: Emotion;
  intensity: number;
  duration: number;
  startTime?: number;
  endTime?: number;
}

interface ScriptDisplayProps {
  lines: ScriptLine[];
  currentLineId?: string;
  activeLineId?: string;
  completedLineIds?: string[];
  onLineSelect?: (lineId: string) => void;
  onLineComplete?: (lineId: string) => void;
  className?: string;
}

interface PracticeMode {
  id: string;
  name: string;
  description: string;
}

const PRACTICE_MODES: PracticeMode[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Practice with full feedback and guidance",
  },
  {
    id: "timed",
    name: "Timed",
    description: "Practice with time limits per line",
  },
  {
    id: "blind",
    name: "Blind",
    description: "Practice without seeing the next lines",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Practice with lines temporarily hidden",
  },
];

interface LineAnnotation {
  lineId: string;
  text: string;
  timestamp: number;
}

interface PracticeModeConfig {
  showNextLines: boolean;
  timerEnabled: boolean;
  memoryInterval: number; // in milliseconds
  lineTimeLimit: number; // in seconds
  showEmotionHints: boolean;
  showIntensityGuide: boolean;
}

const MODE_CONFIGS: Record<string, PracticeModeConfig> = {
  standard: {
    showNextLines: true,
    timerEnabled: false,
    memoryInterval: 0,
    lineTimeLimit: 0,
    showEmotionHints: true,
    showIntensityGuide: true,
  },
  timed: {
    showNextLines: true,
    timerEnabled: true,
    memoryInterval: 0,
    lineTimeLimit: 30,
    showEmotionHints: true,
    showIntensityGuide: true,
  },
  blind: {
    showNextLines: false,
    timerEnabled: false,
    memoryInterval: 0,
    lineTimeLimit: 0,
    showEmotionHints: true,
    showIntensityGuide: true,
  },
  memory: {
    showNextLines: true,
    timerEnabled: false,
    memoryInterval: 5000,
    lineTimeLimit: 0,
    showEmotionHints: false,
    showIntensityGuide: false,
  },
};

export function ScriptDisplay({
  lines,
  currentLineId,
  activeLineId,
  completedLineIds = [],
  onLineSelect,
  onLineComplete,
  className,
}: ScriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [practiceMode, setPracticeMode] = useState<string>("standard");
  const [annotations, setAnnotations] = useState<LineAnnotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState<string | null>(
    null
  );
  const [annotationText, setAnnotationText] = useState("");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isMemoryPhase, setIsMemoryPhase] = useState(false);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  // Auto-scroll to current line
  useEffect(() => {
    if (!autoScroll || !currentLineId || !containerRef.current) return;

    const currentElement = document.getElementById(
      `script-line-${currentLineId}`
    );
    if (currentElement) {
      const container = containerRef.current;
      const elementTop = currentElement.offsetTop;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elementBottom = elementTop + currentElement.clientHeight;

      if (elementTop < containerTop || elementBottom > containerBottom) {
        currentElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentLineId, autoScroll]);

  // Handle manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Disable auto-scroll if user manually scrolls up
    // Re-enable when they scroll to bottom
    setAutoScroll(scrollTop + clientHeight >= scrollHeight - 50);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          const prevIndex = lines.findIndex((l) => l.id === currentLineId);
          if (prevIndex > 0) {
            onLineSelect?.(lines[prevIndex - 1].id);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = lines.findIndex((l) => l.id === currentLineId);
          if (nextIndex < lines.length - 1) {
            onLineSelect?.(lines[nextIndex + 1].id);
          }
          break;
        case " ":
          e.preventDefault();
          if (currentLineId) {
            onLineComplete?.(currentLineId);
          }
          break;
        case "n":
          e.preventDefault();
          setShowAnnotationInput(currentLineId);
          break;
        case "?":
          e.preventDefault();
          setShowKeyboardShortcuts((prev) => !prev);
          break;
        case "Escape":
          e.preventDefault();
          if (showAnnotationInput) {
            setShowAnnotationInput(null);
          }
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    currentLineId,
    lines,
    onLineSelect,
    onLineComplete,
    showAnnotationInput,
    showKeyboardShortcuts,
  ]);

  const addAnnotation = (lineId: string, text: string) => {
    setAnnotations((prev) => [
      ...prev,
      {
        lineId,
        text,
        timestamp: Date.now(),
      },
    ]);
    setShowAnnotationInput(null);
    setAnnotationText("");
  };

  // Update visible lines based on practice mode
  useEffect(() => {
    const config = MODE_CONFIGS[practiceMode];
    if (!config) return;

    if (!config.showNextLines) {
      // Blind mode: only show current and previous lines
      setVisibleLines(
        lines
          .slice(0, lines.findIndex((l) => l.id === currentLineId) + 1)
          .map((l) => l.id)
      );
    } else if (isMemoryPhase) {
      // Memory mode in memory phase: hide all lines
      setVisibleLines([]);
    } else {
      // Show all lines
      setVisibleLines(lines.map((l) => l.id));
    }
  }, [practiceMode, currentLineId, lines, isMemoryPhase]);

  // Handle time expired in timed mode
  const handleTimeExpired = () => {
    if (currentLineId) {
      const currentIndex = lines.findIndex((l) => l.id === currentLineId);
      if (currentIndex < lines.length - 1) {
        onLineSelect?.(lines[currentIndex + 1].id);
      }
    }
  };

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {/* Practice Mode Selector */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            Practice Mode:
          </span>
          <div className="flex space-x-2">
            {PRACTICE_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setPracticeMode(mode.id)}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  practiceMode === mode.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}
                title={mode.description}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Practice Mode Manager */}
      {currentLineId && (
        <PracticeModeManager
          mode={practiceMode}
          currentLine={lines.find((l) => l.id === currentLineId)!}
          onTimeExpired={handleTimeExpired}
          onMemoryPhaseChange={setIsMemoryPhase}
          className="mb-4"
        />
      )}

      {/* Script Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Practice Script</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "px-3 py-1 rounded text-sm",
              autoScroll
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            )}
          >
            {autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
          </button>
          <div className="text-sm text-gray-500">
            {completedLineIds.length} / {lines.length} lines completed
          </div>
        </div>
      </div>

      {/* Script Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="space-y-4 p-4">
          {lines.map((line) => {
            const isVisible = visibleLines.includes(line.id);
            if (!isVisible) return null;

            return (
              <ScriptLine
                key={line.id}
                id={`script-line-${line.id}`}
                text={line.text}
                emotion={line.emotion}
                intensity={line.intensity}
                isActive={line.id === activeLineId}
                isCurrent={line.id === currentLineId}
                isCompleted={completedLineIds.includes(line.id)}
                onLineClick={() => onLineSelect?.(line.id)}
                annotations={annotations.filter((a) => a.lineId === line.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Practice Controls */}
      <div className="border-t p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {/* Progress Indicators */}
            <div className="flex items-center space-x-1">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    {
                      "bg-green-500": completedLineIds.includes(line.id),
                      "bg-blue-500": line.id === currentLineId,
                      "bg-gray-300":
                        !completedLineIds.includes(line.id) &&
                        line.id !== currentLineId,
                    }
                  )}
                />
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const currentIndex = lines.findIndex(
                  (l) => l.id === currentLineId
                );
                if (currentIndex > 0) {
                  onLineSelect?.(lines[currentIndex - 1].id);
                }
              }}
              disabled={!currentLineId || currentLineId === lines[0].id}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                const currentIndex = lines.findIndex(
                  (l) => l.id === currentLineId
                );
                if (currentIndex < lines.length - 1) {
                  onLineSelect?.(lines[currentIndex + 1].id);
                }
              }}
              disabled={
                !currentLineId || currentLineId === lines[lines.length - 1].id
              }
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Line Annotations */}
      {showAnnotationInput === currentLineId && (
        <div className="absolute bottom-full left-0 w-full p-2 bg-white shadow-lg rounded-t-lg">
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add a note about this line..."
            className="w-full p-2 border rounded"
            autoFocus
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setShowAnnotationInput(null)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => addAnnotation(currentLineId, annotationText)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 right-4">
        <button
          className="p-2 text-gray-500 hover:text-gray-700"
          onClick={() => setShowKeyboardShortcuts(true)}
          title="Show keyboard shortcuts (Press ?)"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}
