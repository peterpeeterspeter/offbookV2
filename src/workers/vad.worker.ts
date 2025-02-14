// Voice Activity Detection Web Worker
export interface VADMetrics {
  averageAmplitude: number;
  peakAmplitude: number;
  silenceRatio: number;
  processingTime: number;
}

export interface VADOptions {
  sampleRate: number;
  frameSize: number;
  mobileOptimization?: {
    enabled: boolean;
    batteryAware: boolean;
    adaptiveBufferSize: boolean;
    powerSaveMode: boolean;
  };
}

class VADProcessor {
  private metrics: VADMetrics = {
    averageAmplitude: 0,
    peakAmplitude: 0,
    silenceRatio: 0,
    processingTime: 0
  };

  private totalAmplitude = 0;
  private sampleCount = 0;
  private silenceCount = 0;
  private readonly SILENCE_THRESHOLD = 0.01;

  processChunk(audioData: Float32Array): VADMetrics {
    const startTime = performance.now();

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i] ?? 0;
      const amplitude = Math.abs(sample);
      
      this.totalAmplitude += amplitude;
      this.sampleCount++;
      
      if (amplitude < this.SILENCE_THRESHOLD) {
        this.silenceCount++;
      }
      
      this.metrics.peakAmplitude = Math.max(this.metrics.peakAmplitude, amplitude);
    }

    this.metrics.averageAmplitude = this.totalAmplitude / this.sampleCount;
    this.metrics.silenceRatio = this.silenceCount / this.sampleCount;
    this.metrics.processingTime = performance.now() - startTime;

    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      averageAmplitude: 0,
      peakAmplitude: 0,
      silenceRatio: 0,
      processingTime: 0
    };
    this.totalAmplitude = 0;
    this.sampleCount = 0;
    this.silenceCount = 0;
  }
}

const processor = new VADProcessor();

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;
  
  switch (type) {
    case "process":
      if (data instanceof Float32Array) {
        const metrics = processor.processChunk(data);
        self.postMessage({ type: "metrics", metrics });
      }
      break;
      
    case "reset":
      processor.reset();
      self.postMessage({ type: "reset" });
      break;
      
    default:
      console.warn("Unknown message type:", type);
  }
};