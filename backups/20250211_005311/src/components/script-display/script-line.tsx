import React from "react";
import { cn } from "../../lib/utils";

type Emotion =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "neutral";

interface ScriptLineProps {
  text: string;
  emotion?: Emotion;
  intensity?: number;
  isActive?: boolean;
  isCurrent?: boolean;
  isCompleted?: boolean;
  timing?: {
    duration: number;
    startTime?: string;
  };
  onLineClick?: () => void;
}

const emotionColors: Record<
  Emotion,
  { bg: string; text: string; border: string }
> = {
  joy: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  sadness: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  anger: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  fear: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
  },
  surprise: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  disgust: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  neutral: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
  },
};

export function ScriptLine({
  text,
  emotion = "neutral",
  intensity = 5,
  isActive = false,
  isCurrent = false,
  isCompleted = false,
  timing,
  onLineClick,
}: ScriptLineProps) {
  const colors = emotionColors[emotion];

  const handleInteraction = () => {
    onLineClick?.();
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={handleInteraction}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleInteraction();
        }
      }}
      aria-label={`${text} - ${emotion} emotion with intensity ${intensity}`}
      aria-current={isCurrent ? "true" : undefined}
      aria-selected={isActive ? "true" : undefined}
      className={cn(
        "p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer relative",
        colors.bg,
        colors.border,
        {
          "border-opacity-100": isActive || isCurrent,
          "border-opacity-50": !isActive && !isCurrent,
          "scale-102 shadow-md": isCurrent,
          "opacity-75": isCompleted,
        }
      )}
    >
      {/* Main Text */}
      <p className={cn("text-lg font-medium mb-2", colors.text)}>{text}</p>

      {/* Metadata Row */}
      <div className="flex items-center justify-between text-sm">
        {/* Emotion and Intensity */}
        <div className="flex items-center space-x-2">
          <span className={cn("font-semibold capitalize", colors.text)}>
            {emotion}
          </span>
          <div
            className="w-20 h-2 bg-gray-200 rounded"
            role="progressbar"
            aria-label={`Emotion intensity: ${intensity} out of 10`}
            aria-valuenow={intensity}
            aria-valuemin={0}
            aria-valuemax={10}
          >
            <div
              className={cn("h-full rounded", colors.bg, "bg-opacity-75")}
              style={{ width: `${(intensity / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Timing Information */}
        {timing && (
          <div className="flex items-center space-x-2 text-gray-600">
            <span>{timing.duration}s</span>
            {timing.startTime && (
              <span>{new Date(timing.startTime).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {isCurrent && (
        <div
          className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-l"
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Completion Status */}
      {isCompleted && (
        <div
          className="absolute right-2 top-2"
          role="status"
          aria-label="Line completed"
        >
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
