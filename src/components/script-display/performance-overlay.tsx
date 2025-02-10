import React from "react";
import type { Emotion, EmotionMetrics } from "../../types/emotions";
import { cn } from "../../lib/utils";

interface PerformanceMetrics {
  emotionMatch: number;
  intensityMatch: number;
  timingAccuracy: number;
  overallScore: number;
}

interface PerformanceOverlayProps {
  isVisible: boolean;
  currentEmotion: Emotion;
  targetEmotion: Emotion;
  currentIntensity: number;
  targetIntensity: number;
  metrics: EmotionMetrics;
  remainingTime?: number;
  className?: string;
}

export function PerformanceOverlay({
  isVisible,
  currentEmotion,
  targetEmotion,
  currentIntensity,
  targetIntensity,
  metrics,
  remainingTime,
  className,
}: PerformanceOverlayProps) {
  if (!isVisible) return null;

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getEmotionMatchText = () => {
    if (currentEmotion === targetEmotion) return "Perfect Match!";
    return `Target: ${targetEmotion} | Current: ${currentEmotion}`;
  };

  return (
    <div
      className={cn(
        "absolute top-0 right-0 p-4 bg-black/80 text-white rounded-bl-lg",
        "backdrop-blur-sm transition-all duration-200",
        className
      )}
    >
      {/* Real-time Feedback */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-2">
          Real-time Feedback
        </h3>
        <div className="space-y-2">
          {/* Emotion Match */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Emotion Match</span>
              <span className={getMatchColor(metrics.emotionMatch)}>
                {metrics.emotionMatch.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-400">{getEmotionMatchText()}</div>
          </div>

          {/* Intensity Match */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Intensity Match</span>
              <span className={getMatchColor(metrics.intensityMatch)}>
                {metrics.intensityMatch.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-gray-700 rounded">
              <div
                className="absolute inset-0 bg-gray-500 rounded"
                style={{ width: `${targetIntensity * 10}%` }}
              />
              <div
                className="absolute inset-0 bg-blue-500 rounded"
                style={{ width: `${currentIntensity * 10}%` }}
              />
            </div>
          </div>

          {/* Timing Accuracy */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Timing Accuracy</span>
              <span className={getMatchColor(metrics.timingAccuracy)}>
                {metrics.timingAccuracy.toFixed(1)}%
              </span>
            </div>
            {remainingTime !== undefined && (
              <div className="text-xs text-gray-400">
                {remainingTime > 0
                  ? `${remainingTime.toFixed(1)}s remaining`
                  : "Time is up!"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold">Overall Score</span>
          <span
            className={cn(
              "text-2xl font-bold",
              getMatchColor(metrics.overallScore)
            )}
          >
            {metrics.overallScore.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Performance Tips */}
      {metrics.overallScore < 70 && (
        <div className="mt-3 p-2 bg-gray-800 rounded text-sm">
          <p className="text-yellow-400 font-medium mb-1">Tips:</p>
          <ul className="text-xs space-y-1 text-gray-300">
            {metrics.emotionMatch < 70 && (
              <li>• Try to express more {targetEmotion} in your voice</li>
            )}
            {metrics.intensityMatch < 70 && (
              <li>
                • {currentIntensity < targetIntensity ? "Increase" : "Decrease"}{" "}
                your emotional intensity
              </li>
            )}
            {metrics.timingAccuracy < 70 && (
              <li>• Pay attention to your pacing and timing</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
