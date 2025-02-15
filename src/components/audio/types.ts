export type VisualizationMode =
  | "waveform"
  | "frequency"
  | "circular"
  | "spectrum"
  | "bars";

export interface VisualizerColors {
  primary: string;
  secondary?: string;
  background: string;
  gradient?: {
    start: string;
    end: string;
  };
}

export interface VisualizerOptions {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
  barSpacing: number;
  barWidth: number;
  lineWidth: number;
  showAxes: boolean;
  showGrid: boolean;
  responsive: boolean;
  gradientMode: boolean;
  colors: VisualizerColors;
}

export interface VisualizerDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}
