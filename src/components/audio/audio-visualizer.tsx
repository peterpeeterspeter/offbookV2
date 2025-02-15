import React from "react";
import { AdvancedVisualizer } from "./advanced-visualizer";
import { VisualizationMode, VisualizerOptions } from "./types";

interface AudioVisualizerProps {
  audioContext: AudioContext;
  analyserNode: AnalyserNode;
  mode?: VisualizationMode;
  options?: Partial<VisualizerOptions>;
  className?: string;
}

export function AudioVisualizer({
  audioContext,
  analyserNode,
  mode = "waveform",
  options,
  className,
}: AudioVisualizerProps) {
  return (
    <div className="w-full h-48">
      <AdvancedVisualizer
        audioContext={audioContext}
        analyserNode={analyserNode}
        mode={mode}
        options={options}
        className={className}
      />
    </div>
  );
}
