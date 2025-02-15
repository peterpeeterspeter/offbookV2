export type VisualizationMode = 'waveform' | 'frequency' | 'circular' | 'spectrum' | 'bars';

export interface VisualizerColors {
  background: string;
  waveform: string;
  frequency: string;
  gradient?: {
    start: string;
    end: string;
  };
}

export interface VisualizerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
  barSpacing?: number;
  barWidth?: number;
  lineWidth?: number;
  showAxes?: boolean;
  showGrid?: boolean;
  responsive?: boolean;
  gradientMode?: boolean;
}

export interface VisualizerContext {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  dataArray: Uint8Array;
  bufferLength: number;
}

export interface VisualizerDimensions {
  width: number;
  height: number;
  dpr: number;
  center: {
    x: number;
    y: number;
  };
}
