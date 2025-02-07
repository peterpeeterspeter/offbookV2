import { useState, useEffect, useCallback } from 'react';
import { EmotionHighlighter } from './EmotionHighlighter';
import { VoiceActivityDetector } from '../services/vad';
import { TextToSpeechService } from '../services/tts';
import { speechCadence } from '../services/speechCadence';
import { getCurrentLine } from '../utils/scriptUtils';

interface ScriptPracticeProps {
  content: string;
  onUpdate: (content: string) => void;
  onPerformanceData?: (data: {
    hesitations: number;
    averagePause: number;
    totalDuration: number;
  }) => void;
}

export function ScriptPractice({ content, onUpdate, onPerformanceData }: ScriptPracticeProps) {
  const [vad] = useState(() => new VoiceActivityDetector({
    timeThreshold: 700, // 700ms silence threshold
    volumeThreshold: 0.15,
  }));
  
  const [tts] = useState(() => new TextToSpeechService());
  const [isListening, setIsListening] = useState(false);
  const [performance, setPerformance] = useState({
    hesitations: 0,
    pauses: [] as number[],
    startTime: 0,
  });

  // Handle speech events
  const handleSpeechStart = useCallback(() => {
    if (performance.startTime === 0) {
      setPerformance(prev => ({ ...prev, startTime: Date.now() }));
    }
  }, [performance.startTime]);

  const handleSpeechEnd = useCallback(() => {
    // Get current line from script
    const currentLine = getCurrentLine(content);
    
    // Analyze speech cadence
    const cadenceData = speechCadence.analyze({
      duration: Date.now() - performance.startTime,
      pauses: performance.pauses
    });

    // Update performance metrics
    setPerformance(prev => ({
      ...prev,
      cadenceScore: cadenceData.score,
      lastLineDuration: cadenceData.duration
    }));

    // Trigger AI response if needed
    if (cadenceData.needsAdjustment) {
      tts.speak(currentLine, {
        emotion: 'coaching',
        intensity: 0.7
      });
    }
  }, [content, performance.startTime, performance.pauses, tts]);

  const handleSilence = useCallback((duration: number) => {
    if (duration > 1500) { // Hesitation threshold
      setPerformance(prev => ({
        ...prev,
        hesitations: prev.hesitations + 1,
        pauses: [...prev.pauses, duration],
      }));
    }
  }, []);

  // Start/stop listening
  const toggleListening = async () => {
    if (isListening) {
      vad.stop();
      setIsListening(false);
      
      // Report performance data
      if (onPerformanceData) {
        const totalDuration = Date.now() - performance.startTime;
        onPerformanceData({
          hesitations: performance.hesitations,
          averagePause: performance.pauses.reduce((a, b) => a + b, 0) / performance.pauses.length,
          totalDuration,
        });
      }
    } else {
      try {
        await vad.start();
        setIsListening(true);
        setPerformance({ hesitations: 0, pauses: [], startTime: 0 });
      } catch (error) {
        console.error('Failed to start VAD:', error);
      }
    }
  };

  useEffect(() => {
    // Set up VAD event handlers
    vad.updateOptions({
      onSpeechStart: handleSpeechStart,
      onSpeechEnd: handleSpeechEnd,
      onSilence: handleSilence,
    });

    return () => {
      vad.stop();
    };
  }, [vad, handleSpeechStart, handleSpeechEnd, handleSilence]);

  return (
    <div className="script-practice">
      <EmotionHighlighter
        content={content}
        onUpdate={onUpdate}
        readOnly={isListening}
      />
      
      <div className="controls">
        <button 
          onClick={toggleListening}
          className={`practice-btn ${isListening ? 'active' : ''}`}
        >
          {isListening ? 'Stop Practice' : 'Start Practice'}
        </button>
        
        {isListening && (
          <div className="status">
            Hesitations: {performance.hesitations}
            {performance.pauses.length > 0 && (
              <> | Avg Pause: {Math.round(
                performance.pauses.reduce((a, b) => a + b, 0) / performance.pauses.length
              )}ms</>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 