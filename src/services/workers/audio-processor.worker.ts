import { AudioFormat, NoiseReductionOptions } from '../audio-processing';

interface WorkerMessage {
  id?: string;
  type: string;
  data: unknown;
}

interface FormatOptions {
  from: AudioFormat;
  to: AudioFormat;
  options?: { bitrate?: number };
  targetSize?: number;
}

interface ConversionResult {
  format: AudioFormat;
  data: ArrayBuffer;
  size: number;
}

interface NoiseReductionResult {
  audio: ArrayBuffer;
  noiseFloor: number;
  frequencyResponse: { speech?: Float32Array };
  reductionProfile: Float32Array;
}

class AudioProcessor {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio processor:', error);
      throw error;
    }
  }

  public async convertFormat(
    audioData: ArrayBuffer,
    options: FormatOptions
  ): Promise<ConversionResult> {
    await this.ensureInitialized();

    const ctx = new OfflineAudioContext(2, audioData.byteLength / 4, 44100);
    const audioBuffer = await ctx.decodeAudioData(audioData);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();

    const processed = await ctx.startRendering();
    const result = this.audioBufferToArray(processed);

    return {
      format: options.to,
      data: result,
      size: result.byteLength
    };
  }

  public async reduceNoise(
    audioData: ArrayBuffer,
    options: NoiseReductionOptions
  ): Promise<NoiseReductionResult> {
    const audioCtx = new OfflineAudioContext(2, 44100 * 2, 44100);
    const audioBuffer = await audioCtx.decodeAudioData(audioData);

    // Create audio processing nodes
    const source = audioCtx.createBufferSource();
    const analyser = audioCtx.createAnalyser();
    const filter = audioCtx.createBiquadFilter();

    // Configure noise reduction
    analyser.fftSize = 2048;
    filter.type = 'highpass';
    filter.frequency.value = 100; // Remove low frequency noise

    if (options.preserveSpeech) {
      // Add bandpass filter for speech frequencies (300Hz - 3400Hz)
      const speechFilter = audioCtx.createBiquadFilter();
      speechFilter.type = 'bandpass';
      speechFilter.frequency.value = 1850; // Center frequency
      speechFilter.Q.value = 0.5; // Wide bandwidth
      filter.connect(speechFilter);
    }

    // Create processing chain
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(filter);
    filter.connect(audioCtx.destination);

    // Process audio
    source.start();
    const renderedBuffer = await audioCtx.startRendering();

    // Calculate noise profile
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);

    const reductionProfile = this.calculateReductionProfile(
      frequencyData,
      options.threshold ?? -50,
      options.reduction ?? 12
    );

    return {
      audio: this.audioBufferToArray(renderedBuffer),
      noiseFloor: this.calculateNoiseFloor(frequencyData),
      frequencyResponse: {
        speech: options.preserveSpeech ? this.extractSpeechBand(frequencyData) : undefined
      },
      reductionProfile
    };
  }

  public async processChunk(chunk: ArrayBuffer): Promise<ArrayBuffer> {
    // Process audio chunk in real-time
    const ctx = new OfflineAudioContext(2, chunk.byteLength / 4, 44100);
    const buffer = await ctx.decodeAudioData(chunk);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();

    const processed = await ctx.startRendering();
    return this.audioBufferToArray(processed);
  }

  private calculateOptimalBitrate(inputSize: number, targetSize?: number): number {
    if (!targetSize) return 192; // Default bitrate
    const duration = inputSize / (44100 * 4); // Assuming 44.1kHz stereo
    return Math.floor((targetSize * 8) / (duration * 1000));
  }

  private calculateReductionProfile(
    frequencies: Float32Array,
    threshold: number,
    reduction: number
  ): Float32Array {
    const profile = new Float32Array(frequencies.length);
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] < threshold) {
        profile[i] = Math.min(reduction, threshold - frequencies[i]);
      }
    }
    return profile;
  }

  private calculateNoiseFloor(frequencies: Float32Array): number {
    return frequencies.reduce((sum, val) => sum + val, 0) / frequencies.length;
  }

  private extractSpeechBand(frequencies: Float32Array): Float32Array {
    // Extract frequencies between 300Hz and 3400Hz
    const binSize = 44100 / frequencies.length;
    const startBin = Math.floor(300 / binSize);
    const endBin = Math.ceil(3400 / binSize);
    return frequencies.slice(startBin, endBin);
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

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Initialize worker
const processor = new AudioProcessor();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, data, id } = event.data;
    let result: ArrayBuffer | ConversionResult | NoiseReductionResult;

    switch (type) {
      case 'convert_format':
        if (
          typeof data === 'object' && data !== null &&
          'audio' in data && data.audio instanceof ArrayBuffer &&
          'options' in data && typeof data.options === 'object'
        ) {
          result = await processor.convertFormat(
            data.audio,
            data.options as FormatOptions
          );
        } else {
          throw new Error('Invalid format conversion parameters');
        }
        break;

      case 'reduce_noise':
        if (
          typeof data === 'object' && data !== null &&
          'audio' in data && data.audio instanceof ArrayBuffer &&
          'options' in data
        ) {
          result = await processor.reduceNoise(
            data.audio,
            data.options as NoiseReductionOptions
          );
        } else {
          throw new Error('Invalid noise reduction parameters');
        }
        break;

      case 'process_chunk':
        if (data instanceof ArrayBuffer) {
          result = await processor.processChunk(data);
        } else {
          throw new Error('Invalid chunk data');
        }
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const transferable = result instanceof ArrayBuffer ? result :
      'data' in result ? result.data :
      result.audio;

    self.postMessage(
      { type: 'result', data: result, id },
      { transfer: [transferable] }
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: event.data.id
    });
  }
};
