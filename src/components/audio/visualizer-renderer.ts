import { VisualizationMode, VisualizerOptions, VisualizerDimensions } from "./types";

interface VisualizerConfig extends VisualizerOptions {
  mode: VisualizationMode;
}

export class VisualizerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analyserNode: AnalyserNode;
  private options: VisualizerConfig;
  private dimensions: Required<VisualizerDimensions>;

  constructor(
    canvas: HTMLCanvasElement,
    analyserNode: AnalyserNode,
    options: Partial<VisualizerOptions> & { mode: VisualizationMode }
  ) {
    this.canvas = canvas;
    this.analyserNode = analyserNode;
    this.options = {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -100,
      maxDecibels: -30,
      barSpacing: 2,
      barWidth: 5,
      lineWidth: 2,
      showAxes: false,
      showGrid: false,
      responsive: true,
      gradientMode: false,
      colors: {
        primary: "#ffffff",
        background: "#000000",
      },
      ...options,
    };

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = context;

    // Initialize with default dimensions
    this.dimensions = {
      width: 300,
      height: 150,
      centerX: 150,
      centerY: 75,
    };

    // Update dimensions based on actual canvas size
    this.updateDimensions();
  }

  private updateDimensions(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      this.dimensions = {
        width,
        height,
        centerX: Math.floor(width / 2),
        centerY: Math.floor(height / 2),
      };
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(): void {
    if (this.options.responsive) {
      this.updateDimensions();
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);

    if (this.options.mode === "waveform") {
      this.analyserNode.getByteTimeDomainData(dataArray);
      this.drawWaveform(dataArray, bufferLength);
    } else {
      this.analyserNode.getByteFrequencyData(dataArray);
      this.drawFrequency(dataArray, bufferLength);
    }
  }

  private drawWaveform(dataArray: Uint8Array, bufferLength: number): void {
    const sliceWidth = this.dimensions.width / bufferLength;
    let x = 0;

    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.strokeStyle = this.options.colors.primary;
    this.ctx.beginPath();

    for (let i = 0; i < bufferLength && i < dataArray.length; i++) {
      const v = dataArray[i]! / 128.0;
      const y = (v * this.dimensions.height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(this.dimensions.width, this.dimensions.height / 2);
    this.ctx.stroke();
  }

  private drawFrequency(dataArray: Uint8Array, bufferLength: number): void {
    const barWidth = (this.dimensions.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength && i < dataArray.length; i++) {
      const barHeight = (dataArray[i]! / 255) * this.dimensions.height;

      this.ctx.fillStyle = this.options.colors.primary;
      this.ctx.fillRect(x, this.dimensions.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }
}
