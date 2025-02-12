export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  AAC = 'aac',
  FLAC = 'flac',
  OGG = 'ogg'
}

export enum StreamStatus {
  Inactive = 'inactive',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Error = 'error'
}

export interface ProcessingOptions {
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  normalize?: boolean;
  targetPeak?: number;
  compression?: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
}

export interface NoiseReductionOptions {
  threshold?: number;
  reduction?: number;
  preserveSpeech?: boolean;
  adaptive?: boolean;
  noiseProfile?: Float32Array;
}

export interface StreamOptions {
  chunkSize?: number;
  overlap?: number;
  realtime?: boolean;
}

export interface ProcessingMetrics {
  totalProcessingTime: number;
  averageChunkProcessingTime: number;
  peakMemoryUsage: number;
  totalChunksProcessed: number;
}

export interface ResourceMetrics {
  memoryUsage: number;
  bufferSize: number;
  processingLoad: number;
}

export interface PerformanceDiagnostics {
  bottlenecks: string[];
  recommendations: string[];
  metrics: ProcessingMetrics;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface WorkerMessage {
  type: string;
  data: unknown;
  id?: string;
}

export class AudioProcessingService {
  private context: AudioContext;
  private processingWorker?: Worker;
  private streamController?: ReadableStreamDefaultController<AudioChunk>;
  private status: StreamStatus = StreamStatus.Inactive;
  private metrics: ProcessingMetrics = {
    totalProcessingTime: 0,
    averageChunkProcessingTime: 0,
    peakMemoryUsage: 0,
    totalChunksProcessed: 0
  };
  private chunkProcessedCallbacks: Array<(chunk: AudioChunk) => void> = [];

  constructor() {
    this.context = new AudioContext();
    this.initializeWorker();
  }

  private initializeWorker() {
    this.processingWorker = new Worker(
      new URL('./workers/audio-processor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.processingWorker.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data as WorkerMessage;
      switch (type) {
        case 'chunk_processed':
          this.handleChunkProcessed(data as AudioChunk);
          break;
        case 'error':
          this.handleProcessingError(data);
          break;
        case 'metrics':
          this.updateMetrics(data as { processingTime?: number; chunkProcessed?: boolean });
          break;
      }
    };
  }

  public async convertFormat(
    audioData: ArrayBuffer,
    options: {
      from: AudioFormat;
      to: AudioFormat;
      options?: { bitrate?: number };
      metadata?: Record<string, unknown>;
      targetSize?: number;
    }
  ): Promise<{ format: AudioFormat; data: ArrayBuffer; size: number; metadata?: Record<string, unknown> }> {
    if (!Object.values(AudioFormat).includes(options.from)) {
      throw new Error('Unsupported format');
    }

    const startTime = performance.now();

    try {
      const message: WorkerMessage = {
        type: 'convert_format',
        data: {
          audio: audioData,
          ...options
        }
      };

      const result = await this.sendWorkerMessage(message);
      this.updateMetrics({
        processingTime: performance.now() - startTime
      });

      return result;
    } catch (error) {
      this.handleProcessingError(error);
      throw error;
    }
  }

  public async enhanceQuality(
    audioBuffer: AudioBuffer,
    options: ProcessingOptions
  ): Promise<AudioBuffer> {
    const startTime = performance.now();

    try {
      // Create processing nodes
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      const compressor = this.context.createDynamicsCompressor();

      // Configure nodes based on options
      if (options.normalize) {
        const peak = this.calculatePeak(audioBuffer);
        const targetPeak = options.targetPeak ?? -3;
        gainNode.gain.value = Math.pow(10, (targetPeak - peak) / 20);
      }

      if (options.compression) {
        Object.assign(compressor, options.compression);
      }

      // Create processing chain
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(compressor);

      // Process audio
      const processedBuffer = await this.processAudioGraph(
        source,
        compressor,
        options
      );

      this.updateMetrics({
        processingTime: performance.now() - startTime
      });

      return processedBuffer;
    } catch (error) {
      this.handleProcessingError(error);
      throw error;
    }
  }

  public async reduceNoise(
    audioBuffer: AudioBuffer,
    options: NoiseReductionOptions
  ): Promise<{
    buffer: AudioBuffer;
    noiseFloor: number;
    frequencyResponse: { speech?: Float32Array };
    reductionProfile: Float32Array;
    noiseProfile?: Float32Array;
  }> {
    const startTime = performance.now();

    try {
      const message: WorkerMessage = {
        type: 'reduce_noise',
        data: {
          audio: this.audioBufferToArray(audioBuffer),
          options
        }
      };

      const result = await this.sendWorkerMessage(message);
      this.updateMetrics({
        processingTime: performance.now() - startTime
      });

      return {
        buffer: await this.context.decodeAudioData(result.audio),
        ...result
      };
    } catch (error) {
      this.handleProcessingError(error);
      throw error;
    }
  }

  public async processStream(
    stream: ReadableStream<ArrayBuffer>,
    options: StreamOptions = {}
  ): Promise<StreamStatus> {
    const { chunkSize = 1024, overlap = 128 } = options;
    this.status = StreamStatus.Active;

    try {
      const reader = stream.getReader();
      let buffer = new ArrayBuffer(0);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer = this.concatenateBuffers(buffer, value);

        while (buffer.byteLength >= chunkSize) {
          const chunk = buffer.slice(0, chunkSize);
          await this.processChunk(chunk);
          buffer = buffer.slice(chunkSize - overlap);
        }
      }

      // Process remaining buffer
      if (buffer.byteLength > 0) {
        await this.processChunk(buffer);
      }

      this.status = StreamStatus.Completed;
      return this.status;
    } catch (error) {
      this.status = StreamStatus.Error;
      this.handleProcessingError(error);
      throw error;
    }
  }

  public createProcessingStream(): ReadableStream<AudioChunk> {
    return new ReadableStream({
      start: (controller) => {
        this.streamController = controller;
      },
      cancel: () => {
        this.status = StreamStatus.Inactive;
      }
    });
  }

  public async pauseProcessing(): Promise<void> {
    this.status = StreamStatus.Paused;
  }

  public async resumeProcessing(): Promise<void> {
    this.status = StreamStatus.Active;
  }

  public getStreamStatus(): StreamStatus {
    return this.status;
  }

  public onChunkProcessed(callback: (chunk: AudioChunk) => void): void {
    this.chunkProcessedCallbacks.push(callback);
  }

  public getProcessingMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  public async getResourceMetrics(): Promise<ResourceMetrics> {
    const memoryUsage = await this.estimateMemoryUsage();
    return {
      memoryUsage,
      bufferSize: this.calculateBufferSize(),
      processingLoad: this.calculateProcessingLoad()
    };
  }

  public async runPerformanceDiagnostics(): Promise<PerformanceDiagnostics> {
    const metrics = this.getProcessingMetrics();
    const bottlenecks = [];
    const recommendations = [];

    if (metrics.averageChunkProcessingTime > 50) {
      bottlenecks.push('High chunk processing time');
      recommendations.push('Consider increasing chunk size');
    }

    if (metrics.peakMemoryUsage > 100 * 1024 * 1024) {
      bottlenecks.push('High memory usage');
      recommendations.push('Consider reducing buffer size');
    }

    return {
      bottlenecks,
      recommendations,
      metrics
    };
  }

  private async processChunk(chunk: ArrayBuffer): Promise<void> {
    const startTime = performance.now();

    try {
      const message: WorkerMessage = {
        type: 'process_chunk',
        data: chunk
      };

      const processedChunk = await this.sendWorkerMessage(message);

      const audioChunk: AudioChunk = {
        data: processedChunk,
        timestamp: Date.now()
      };

      this.streamController?.enqueue(audioChunk);
      this.handleChunkProcessed(audioChunk);

      this.updateMetrics({
        processingTime: performance.now() - startTime,
        chunkProcessed: true
      });
    } catch (error) {
      this.handleProcessingError(error);
      throw error;
    }
  }

  private async sendWorkerMessage(message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();
      const handler = (event: MessageEvent) => {
        const data = event.data as WorkerMessage;
        if (data.id === messageId) {
          this.processingWorker?.removeEventListener('message', handler);
          if ('error' in data) {
            reject(data.error);
          } else {
            resolve(data.data);
          }
        }
      };

      this.processingWorker?.addEventListener('message', handler);
      this.processingWorker?.postMessage({ ...message, id: messageId });
    });
  }

  private handleChunkProcessed(chunk: AudioChunk): void {
    this.chunkProcessedCallbacks.forEach(callback => callback(chunk));
  }

  private handleProcessingError(error: unknown): void {
    console.error('Audio processing error:', error);
    this.status = StreamStatus.Error;
  }

  private updateMetrics(data: { processingTime?: number; chunkProcessed?: boolean }): void {
    if (data.processingTime) {
      this.metrics.totalProcessingTime += data.processingTime;
    }
    if (data.chunkProcessed) {
      this.metrics.totalChunksProcessed++;
      this.metrics.averageChunkProcessingTime =
        this.metrics.totalProcessingTime / this.metrics.totalChunksProcessed;
    }
  }

  private calculatePeak(buffer: AudioBuffer): number {
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
    }
    return 20 * Math.log10(peak);
  }

  private async processAudioGraph(
    source: AudioBufferSourceNode,
    destination: AudioNode,
    options: ProcessingOptions
  ): Promise<AudioBuffer> {
    return new Promise((resolve) => {
      const offlineContext = new OfflineAudioContext(
        options.channels ?? 2,
        source.buffer?.length ?? 0,
        options.sampleRate ?? this.context.sampleRate
      );

      source.connect(destination);
      destination.connect(offlineContext.destination);

      offlineContext.startRendering().then(resolve);
      source.start();
    });
  }

  private audioBufferToArray(buffer: AudioBuffer): ArrayBuffer {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 4; // 4 bytes per float
    const result = new ArrayBuffer(length);
    const view = new Float32Array(result);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      view.set(channelData, channel * buffer.length);
    }

    return result;
  }

  private concatenateBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }

  private async estimateMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return 0;
  }

  private calculateBufferSize(): number {
    // Estimate based on current processing state
    return this.metrics.totalChunksProcessed * 1024; // Assuming 1KB chunks
  }

  private calculateProcessingLoad(): number {
    return this.metrics.averageChunkProcessingTime / 16.67; // Normalized to 60fps frame time
  }

  public cleanup(): void {
    if (this.processingWorker) {
      this.processingWorker.terminate();
      this.processingWorker = undefined;
    }
    if (this.context) {
      this.context.close();
    }
    this.streamController = undefined;
    this.status = StreamStatus.Inactive;
    this.chunkProcessedCallbacks = [];
  }
}
