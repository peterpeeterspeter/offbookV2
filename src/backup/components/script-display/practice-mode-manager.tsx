import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ScriptLine } from './script-display';

interface PracticeModeConfig {
  showNextLines: boolean;
  timerEnabled: boolean;
  memoryInterval: number;  // in milliseconds
  lineTimeLimit: number;   // in seconds
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
    showIntensityGuide: true
  },
  timed: {
    showNextLines: true,
    timerEnabled: true,
    memoryInterval: 0,
    lineTimeLimit: 30,
    showEmotionHints: true,
    showIntensityGuide: true
  },
  blind: {
    showNextLines: false,
    timerEnabled: false,
    memoryInterval: 0,
    lineTimeLimit: 0,
    showEmotionHints: true,
    showIntensityGuide: true
  },
  memory: {
    showNextLines: true,
    timerEnabled: false,
    memoryInterval: 5000,
    lineTimeLimit: 0,
    showEmotionHints: false,
    showIntensityGuide: false
  }
};

interface PracticeModeManagerProps {
  mode: string;
  currentLine: ScriptLine;
  onTimeExpired?: () => void;
  onMemoryPhaseChange?: (isMemoryPhase: boolean) => void;
  className?: string;
}

export function PracticeModeManager({
  mode,
  currentLine,
  onTimeExpired,
  onMemoryPhaseChange,
  className
}: PracticeModeManagerProps) {
  const config = MODE_CONFIGS[mode];
  const [timeRemaining, setTimeRemaining] = useState(config.lineTimeLimit);
  const [isMemoryPhase, setIsMemoryPhase] = useState(false);
  const [streak, setStreak] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);

  // Timer logic for timed mode
  useEffect(() => {
    if (!config.timerEnabled || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.timerEnabled, timeRemaining, onTimeExpired]);

  // Memory mode logic
  useEffect(() => {
    if (!config.memoryInterval) return;

    const memoryTimer = setInterval(() => {
      setIsMemoryPhase(prev => {
        const next = !prev;
        onMemoryPhaseChange?.(next);
        return next;
      });
    }, config.memoryInterval);

    return () => clearInterval(memoryTimer);
  }, [config.memoryInterval, onMemoryPhaseChange]);

  // Reset timer when line changes
  useEffect(() => {
    setTimeRemaining(config.lineTimeLimit);
  }, [currentLine.id, config.lineTimeLimit]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode-specific UI elements */}
      {config.timerEnabled && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Time Remaining:</span>
          <span className={cn(
            'text-lg font-bold',
            timeRemaining <= 5 ? 'text-red-500' : 'text-gray-900'
          )}>
            {timeRemaining}s
          </span>
        </div>
      )}

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700">Current Streak</div>
          <div className="text-2xl font-bold text-blue-600">{streak}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700">Personal Best</div>
          <div className="text-2xl font-bold text-green-600">{personalBest}</div>
        </div>
      </div>

      {/* Mode-specific Guidance */}
      {config.showEmotionHints && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-800 mb-1">
            Emotion Guide
          </div>
          <div className="text-sm text-blue-600">
            Try to express {currentLine.emotion} with intensity level {currentLine.intensity}
          </div>
        </div>
      )}

      {/* Memory Mode Indicator */}
      {config.memoryInterval > 0 && (
        <div className={cn(
          'p-3 rounded-lg transition-colors',
          isMemoryPhase ? 'bg-yellow-50' : 'bg-green-50'
        )}>
          <div className={cn(
            'text-sm font-medium mb-1',
            isMemoryPhase ? 'text-yellow-800' : 'text-green-800'
          )}>
            {isMemoryPhase ? 'Memorization Phase' : 'Practice Phase'}
          </div>
          <div className={cn(
            'text-sm',
            isMemoryPhase ? 'text-yellow-600' : 'text-green-600'
          )}>
            {isMemoryPhase
              ? 'Memorize the line and emotion'
              : 'Practice from memory'}
          </div>
        </div>
      )}
    </div>
  );
} 