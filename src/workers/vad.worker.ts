import { VADState } from '../services/vad-service';

// Extend Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
    };
  }
}

// Worker message types
export interface VADWorkerMessage {
  type: 'processAudio' | 'configure' | 'terminate' | 'getMetrics';
  data: Float32Array | VADWorkerConfig;
}

export interface VADWorkerConfig {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
  powerSaveMode?: boolean;
  mobileOptimization?: {
    enabled: boolean;
    batteryAware: boolean;
    adaptiveBufferSize: boolean;
    powerSaveMode: boolean;
  };
}

export interface VADWorkerResponse {
  type: 'state' | 'error' | 'metrics';
  data: VADState | Error | VADMetrics;
}

export interface VADMetrics {
  averageProcessingTime: number;
  peakMemoryUsage: number;
  totalSamplesProcessed: number;
  stateTransitions: number;
  errorCount: number;
}

let config: VADWorkerConfig = {
  sampleRate: 16000,
  bufferSize: 1024,
  noiseThreshold: 0.5,
  silenceThreshold: 0.8,
  powerSaveMode: false
};

// Thread-safe state management
let currentState: VADState = {
  speaking: false,
  noiseLevel: 0,
  confidence: 0,
  lastActivity: Date.now()
};

// Performance monitoring
const metrics: VADMetrics = {
  averageProcessingTime: 0,
  peakMemoryUsage: 0,
  totalSamplesProcessed: 0,
  stateTransitions: 0,
  errorCount: 0
};

let processingTimes: number[] = [];
const MAX_PROCESSING_TIMES = 100;

// Adaptive thresholds
let noiseFloor = 0;
let peakLevel = 1;
const NOISE_FLOOR_ALPHA = 0.95;
const PEAK_LEVEL_ALPHA = 0.95;

// Sliding window for noise level averaging in power save mode
const WINDOW_SIZE = 3;
const noiseWindow: number[] = [];

// Process audio data in the worker thread
function processAudioData(audioData: Float32Array): VADState {
  const startTime = performance.now();

  try {
    // Calculate RMS volume with optional smoothing
    const rms = calculateRMS(audioData);
    const smoothedRms = config.powerSaveMode ? smoothNoiseLevel(rms) : rms;

    // Update adaptive thresholds
    updateAdaptiveThresholds(smoothedRms);

    // Get effective thresholds
    const effectiveNoiseThreshold = config.powerSaveMode ?
      Math.max(config.noiseThreshold, noiseFloor * 1.5) :
      config.noiseThreshold;

    const effectiveSilenceThreshold = config.powerSaveMode ?
      Math.min(config.silenceThreshold, peakLevel * 0.8) :
      config.silenceThreshold;

    // Update state atomically
    const wasSpeaking = currentState.speaking;
    const newState = {
      speaking: smoothedRms > effectiveNoiseThreshold,
      noiseLevel: smoothedRms,
      confidence: calculateConfidence(smoothedRms, effectiveNoiseThreshold, effectiveSilenceThreshold),
      lastActivity: Date.now()
    };

    // Update metrics
    if (wasSpeaking !== newState.speaking) {
      metrics.stateTransitions++;
    }
    metrics.totalSamplesProcessed += audioData.length;

    // Update processing time metrics
    const processingTime = performance.now() - startTime;
    updateProcessingTimeMetrics(processingTime);

    // Update memory metrics
    if (performance.memory) {
      metrics.peakMemoryUsage = Math.max(
        metrics.peakMemoryUsage,
        performance.memory.usedJSHeapSize
      );
    }

    return newState;
  } catch (error) {
    metrics.errorCount++;
    throw error;
  }
}

function updateProcessingTimeMetrics(processingTime: number): void {
  processingTimes.push(processingTime);
  if (processingTimes.length > MAX_PROCESSING_TIMES) {
    processingTimes.shift();
  }
  metrics.averageProcessingTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
}

function updateAdaptiveThresholds(rms: number): void {
  // Update noise floor
  if (rms < noiseFloor) {
    noiseFloor = rms;
  } else {
    noiseFloor = NOISE_FLOOR_ALPHA * noiseFloor + (1 - NOISE_FLOOR_ALPHA) * rms;
  }

  // Update peak level
  if (rms > peakLevel) {
    peakLevel = rms;
  } else {
    peakLevel = PEAK_LEVEL_ALPHA * peakLevel + (1 - PEAK_LEVEL_ALPHA) * rms;
  }
}

function calculateRMS(audioData: Float32Array): number {
  // Optimize for mobile by processing fewer samples in power save mode
  const stride = config.powerSaveMode ? 2 : 1;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < audioData.length; i += stride) {
    sum += audioData[i] * audioData[i];
    count++;
  }

  return Math.sqrt(sum / count);
}

function smoothNoiseLevel(currentRms: number): number {
  // Add current RMS to window
  noiseWindow.push(currentRms);

  // Keep window size fixed
  if (noiseWindow.length > WINDOW_SIZE) {
    noiseWindow.shift();
  }

  // Calculate moving average
  return noiseWindow.reduce((sum, val) => sum + val, 0) / noiseWindow.length;
}

function calculateConfidence(rms: number, noiseThreshold: number, silenceThreshold: number): number {
  if (rms <= noiseThreshold) return 0;
  if (rms >= silenceThreshold) return 1;

  // Add hysteresis in power save mode to prevent rapid state changes
  if (config.powerSaveMode) {
    const hysteresis = 0.1;
    if (currentState.speaking) {
      if (rms < noiseThreshold - hysteresis) return 0;
    } else {
      if (rms > noiseThreshold + hysteresis) return 1;
    }
  }

  return (rms - noiseThreshold) / (silenceThreshold - noiseThreshold);
}

// Worker message handler
self.onmessage = (event: MessageEvent<VADWorkerMessage>) => {
  try {
    switch (event.data.type) {
      case 'processAudio':
        const audioData = event.data.data as Float32Array;
        const newState = processAudioData(audioData);

        // Only update state if significant change in power save mode
        if (!config.powerSaveMode || shouldUpdateState(newState)) {
          currentState = newState; // Atomic update
          self.postMessage({ type: 'state', data: newState });
        }
        break;

      case 'configure':
        const newConfig = event.data.data as VADWorkerConfig;

        // Clear noise window and reset adaptive thresholds on config changes
        if (newConfig.powerSaveMode !== config.powerSaveMode) {
          noiseWindow.length = 0;
          noiseFloor = 0;
          peakLevel = 1;
        }

        config = newConfig;
        break;

      case 'getMetrics':
        self.postMessage({ type: 'metrics', data: metrics });
        break;

      case 'terminate':
        cleanup();
        self.close();
        break;

      default:
        throw new Error('Unknown message type');
    }
  } catch (error) {
    metrics.errorCount++;
    self.postMessage({
      type: 'error',
      data: error instanceof Error ? error : new Error('Unknown error')
    });
  }
};

function shouldUpdateState(newState: VADState): boolean {
  const noiseDiff = Math.abs(newState.noiseLevel - currentState.noiseLevel);
  const significantChange = noiseDiff > 0.1 || newState.speaking !== currentState.speaking;
  return significantChange;
}

function cleanup(): void {
  // Clear any cached data
  noiseWindow.length = 0;
  processingTimes.length = 0;

  // Reset adaptive thresholds
  noiseFloor = 0;
  peakLevel = 1;

  // Reset metrics
  metrics.averageProcessingTime = 0;
  metrics.peakMemoryUsage = 0;
  metrics.totalSamplesProcessed = 0;
  metrics.stateTransitions = 0;
  metrics.errorCount = 0;

  // Reset state
  currentState = {
    speaking: false,
    noiseLevel: 0,
    confidence: 0,
    lastActivity: Date.now()
  };
}
