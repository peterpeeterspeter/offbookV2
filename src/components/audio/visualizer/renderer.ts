import { AudioDataAccessor } from './audio-data';
import type {
  VisualizerContext,
  VisualizerColors,
  VisualizerOptions,
  VisualizerDimensions
} from './types';

export class VisualizerRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private dimensions: VisualizerDimensions;
  private gradients: Map<string, CanvasGradient>;

  constructor(width: number, height: number) {
    this.offscreenCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    this.dimensions = {
      width: width * dpr,
      height: height * dpr,
      dpr,
      center: {
        x: (width * dpr) / 2,
        y: (height * dpr) / 2
      }
    };

    this.offscreenCanvas.width = this.dimensions.width;
    this.offscreenCanvas.height = this.dimensions.height;

    const ctx = this.offscreenCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.offscreenCtx = ctx;
    this.offscreenCtx.scale(dpr, dpr);

    this.gradients = new Map();
  }

  private createGradient(colors: VisualizerColors): CanvasGradient {
    if (!colors.gradient) return this.offscreenCtx.createLinearGradient(0, 0, 0, this.dimensions.height);

    const key = `${colors.gradient.start}-${colors.gradient.end}`;
    if (this.gradients.has(key)) return this.gradients.get(key)!;

    const gradient = this.offscreenCtx.createLinearGradient(
      0,
      0,
      0,
      this.dimensions.height
    );
    gradient.addColorStop(0, colors.gradient.start);
    gradient.addColorStop(1, colors.gradient.end);
    this.gradients.set(key, gradient);
    return gradient;
  }

  private drawGrid(options: VisualizerOptions = {}): void {
    const { width, height } = this.dimensions;
    this.offscreenCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.offscreenCtx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x < width; x += 50) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(x, 0);
      this.offscreenCtx.lineTo(x, height);
      this.offscreenCtx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y < height; y += 50) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(0, y);
      this.offscreenCtx.lineTo(width, y);
      this.offscreenCtx.stroke();
    }
  }

  drawWaveform(
    visualizer: VisualizerContext,
    colors: VisualizerColors,
    options: VisualizerOptions = {}
  ): HTMLCanvasElement {
    const { dataArray, bufferLength, analyser } = visualizer;
    const accessor = new AudioDataAccessor(dataArray, bufferLength);
    const { width, height } = this.dimensions;

    analyser.getByteTimeDomainData(dataArray);

    this.offscreenCtx.fillStyle = colors.background;
    this.offscreenCtx.fillRect(0, 0, width, height);

    if (options.showGrid) {
      this.drawGrid(options);
    }

    this.offscreenCtx.lineWidth = options.lineWidth || 2;
    this.offscreenCtx.strokeStyle = options.gradientMode
      ? this.createGradient(colors)
      : colors.waveform;
    this.offscreenCtx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = accessor.getScaledValue(i, 128.0);
      if (value !== null) {
        const y = (value * height) / 2;
        if (i === 0) {
          this.offscreenCtx.moveTo(x, y);
        } else {
          this.offscreenCtx.lineTo(x, y);
        }
      }
      x += sliceWidth;
    }

    this.offscreenCtx.lineTo(width, height / 2);
    this.offscreenCtx.stroke();

    return this.offscreenCanvas;
  }

  drawCircular(
    visualizer: VisualizerContext,
    colors: VisualizerColors,
    options: VisualizerOptions = {}
  ): HTMLCanvasElement {
    const { dataArray, bufferLength, analyser } = visualizer;
    const accessor = new AudioDataAccessor(dataArray, bufferLength);
    const { center } = this.dimensions;

    analyser.getByteFrequencyData(dataArray);

    this.offscreenCtx.fillStyle = colors.background;
    this.offscreenCtx.fillRect(0, 0, this.dimensions.width, this.dimensions.height);

    const radius = Math.min(center.x, center.y) * 0.8;
    const barWidth = (2 * Math.PI) / bufferLength;

    this.offscreenCtx.save();
    this.offscreenCtx.translate(center.x, center.y);

    for (let i = 0; i < bufferLength; i++) {
      const value = accessor.getScaledValue(i, 255);
      if (value !== null) {
        const barHeight = value * radius;
        const angle = i * barWidth;

        const x = Math.cos(angle) * (radius - barHeight);
        const y = Math.sin(angle) * (radius - barHeight);

        this.offscreenCtx.beginPath();
        this.offscreenCtx.strokeStyle = options.gradientMode
          ? `hsl(${(i / bufferLength) * 360}, 100%, 50%)`
          : colors.frequency;
        this.offscreenCtx.lineWidth = options.barWidth || 2;
        this.offscreenCtx.moveTo(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        );
        this.offscreenCtx.lineTo(x, y);
        this.offscreenCtx.stroke();
      }
    }

    this.offscreenCtx.restore();
    return this.offscreenCanvas;
  }

  drawSpectrum(
    visualizer: VisualizerContext,
    colors: VisualizerColors,
    options: VisualizerOptions = {}
  ): HTMLCanvasElement {
    const { dataArray, bufferLength, analyser } = visualizer;
    const accessor = new AudioDataAccessor(dataArray, bufferLength);
    const { width, height } = this.dimensions;

    analyser.getByteFrequencyData(dataArray);

    this.offscreenCtx.fillStyle = colors.background;
    this.offscreenCtx.fillRect(0, 0, width, height);

    if (options.showGrid) {
      this.drawGrid(options);
    }

    const gradient = this.createGradient(colors);
    const barWidth = options.barWidth || (width / bufferLength) * 2.5;
    const spacing = options.barSpacing || 1;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = accessor.getScaledValue(i, 255);
      if (value !== null) {
        const barHeight = value * height;

        if (options.gradientMode) {
          const hue = (i / bufferLength) * 360;
          this.offscreenCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        } else {
          this.offscreenCtx.fillStyle = gradient;
        }

        this.offscreenCtx.fillRect(
          x,
          height - barHeight,
          barWidth,
          barHeight
        );
      }
      x += barWidth + spacing;
    }

    return this.offscreenCanvas;
  }

  drawBars(
    visualizer: VisualizerContext,
    colors: VisualizerColors,
    options: VisualizerOptions = {}
  ): HTMLCanvasElement {
    const { dataArray, bufferLength, analyser } = visualizer;
    const accessor = new AudioDataAccessor(dataArray, bufferLength);
    const { width, height } = this.dimensions;

    analyser.getByteFrequencyData(dataArray);

    this.offscreenCtx.fillStyle = colors.background;
    this.offscreenCtx.fillRect(0, 0, width, height);

    const barWidth = options.barWidth || width / bufferLength;
    const spacing = options.barSpacing || 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = accessor.getScaledValue(i, 255);
      if (value !== null) {
        const barHeight = value * height;

        if (options.gradientMode) {
          const intensity = Math.min(255, Math.floor(barHeight + 100));
          this.offscreenCtx.fillStyle = `rgb(0, ${intensity}, ${255 - intensity})`;
        } else {
          this.offscreenCtx.fillStyle = colors.frequency;
        }

        this.offscreenCtx.fillRect(
          x,
          height - barHeight,
          barWidth,
          barHeight
        );
      }
      x += barWidth + spacing;
    }

    return this.offscreenCanvas;
  }

  updateDimensions(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.dimensions = {
      width: width * dpr,
      height: height * dpr,
      dpr,
      center: {
        x: (width * dpr) / 2,
        y: (height * dpr) / 2
      }
    };
    this.offscreenCanvas.width = this.dimensions.width;
    this.offscreenCanvas.height = this.dimensions.height;
    this.offscreenCtx.scale(dpr, dpr);
    this.gradients.clear();
  }
}
