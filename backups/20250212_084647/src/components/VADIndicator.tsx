import React, { useEffect, useState } from "react";
import { AudioService } from "@/services/audio-service";
import { AudioServiceStateData } from "@/services/audio-state";

interface VADState {
  speaking: boolean;
  noiseLevel: number;
  confidence: number;
}

const VADIndicator: React.FC = () => {
  const [vadState, setVadState] = useState<VADState | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = AudioService.addStateListener(
      (state: AudioServiceStateData) => {
        setIsEnabled(state.context.vadEnabled);
        if (state.vad) {
          setVadState({
            speaking: state.vad.speaking,
            noiseLevel: state.vad.noiseLevel,
            confidence: state.vad.confidence,
          });
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (!isEnabled || !vadState) {
    return null;
  }

  const getStatusColor = () => {
    if (vadState.speaking) return "bg-green-500";
    if (vadState.noiseLevel > 0.8) return "bg-red-500";
    return "bg-gray-500";
  };

  const getConfidenceLevel = () => {
    if (vadState.confidence > 0.8) return "High";
    if (vadState.confidence > 0.5) return "Medium";
    return "Low";
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg">
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium">
          {vadState.speaking ? "Speaking" : "Silent"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Noise Level:</span>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div
              className={`h-full rounded-full ${
                vadState.noiseLevel > 0.8 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${vadState.noiseLevel * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs">
          <span>Confidence:</span>
          <span
            className={`font-medium ${
              vadState.confidence > 0.8
                ? "text-green-600"
                : vadState.confidence > 0.5
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {getConfidenceLevel()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VADIndicator;
