import {
  AudioServiceError,
  AudioServiceEvent,
  AudioStateManager
} from './audio-state';
import { VADMetrics } from '../workers/vad.worker';

// VAD Service Types
export interface VADConfig {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
}

export interface VADState {
  speaking: boolean;
  noiseLevel: number;
  lastActivity: number;
  confidence: number;
}

export interface VADOptions {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
  mobileOptimization?: {
    enabled: boolean;
    batteryAware: boolean;
    adaptiveBufferSize: boolean;
    powerSaveMode: boolean;
  };
}

export interface DeviceCapabilities {
  isMobile: boolean;
  hasBatteryAPI: boolean;
  cpuCores: number;
  hasLowLatencyAudio: boolean;
  hasWebWorker: boolean;
  hasPerformanceAPI: boolean;
}

export interface VADPerformanceMetrics extends VADMetrics {
  deviceCapabilities: DeviceCapabilities;
  batteryLevel?: number;
  isCharging?: boolean;
  audioContextLatency?: number;
}

type VADStateListener = (state: VADState) => void;
type VADErrorListener = (error: Error) => void;
type VADMetricsListener = (metrics: VADPerformanceMetrics) => void;

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Voice Activity Detection service using WebRTC
 */
export class VADService {
  private worker: Worker | null = null;
  private stateListeners: Set<VADStateListener> = new Set();
  private errorListeners: Set<VADErrorListener> = new Set();
  private metricsListeners: Set<VADMetricsListener> = new Set();
  private options: VADOptions;
  private deviceCapabilities: DeviceCapabilities;
  private batteryManager: BatteryManager | null = null;
  private isLowPower = false;
  private audioContext: AudioContext | null = null;
  private metricsInterval: number | null = null;
  private lastMetrics: VADPerformanceMetrics | null = null;
  private scrollTimeout: number | null = null;
  private isProcessingPaused = false;
  private config: VADConfig;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;

  constructor(config: VADConfig) {
    this.config = config;
    this.options = {
      ...config,
      mobileOptimization: {
        enabled: true,
        batteryAware: true,
        adaptiveBufferSize: true,
        powerSaveMode: false,
      }
    };
    this.deviceCapabilities = this.detectDeviceCapabilities();
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      hasBatteryAPI: 'getBattery' in navigator,
      cpuCores: navigator.hardwareConcurrency || 1,
      hasLowLatencyAudio: 'audioWorklet' in AudioContext.prototype,
      hasWebWorker: typeof Worker !== 'undefined',
      hasPerformanceAPI: typeof performance !== 'undefined' && 'memory' in performance
    };
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if (this.deviceCapabilities.hasBatteryAPI && this.options.mobileOptimization?.batteryAware) {
      try {
        const batteryManager = await (navigator as any).getBattery();
        this.batteryManager = batteryManager;
        const handleBatteryChange = () => this.handleBatteryChange();
        batteryManager.addEventListener('levelchange', handleBatteryChange);
        batteryManager.addEventListener('chargingchange', handleBatteryChange);
        this.handleBatteryChange();
      } catch (error) {
        // Update device capabilities to reflect Battery API unavailability
        this.deviceCapabilities.hasBatteryAPI = false;

        // Set conservative defaults for power management
        this.isLowPower = this.deviceCapabilities.isMobile;

        // Update metrics
        if (this.lastMetrics) {
          this.lastMetrics.batteryLevel = undefined;
          this.lastMetrics.isCharging = undefined;
          this.notifyMetricsListeners(this.lastMetrics);
        }

        // Update worker configuration with power-saving settings for mobile
        if (this.deviceCapabilities.isMobile) {
          this.updateWorkerConfig();
        }
      }
    }
  }

  private handleBatteryChange(): void {
    if (!this.batteryManager) return;

    const isLowPower = this.batteryManager.level < 0.2 && !this.batteryManager.charging;
    if (isLowPower !== this.isLowPower) {
      this.isLowPower = isLowPower;
      this.updateWorkerConfig();
    }

    // Update metrics
    if (this.lastMetrics) {
      this.lastMetrics.batteryLevel = this.batteryManager.level;
      this.lastMetrics.isCharging = this.batteryManager.charging;
      this.notifyMetricsListeners(this.lastMetrics);
    }
  }

  private getOptimalBufferSize(): number {
    if (!this.deviceCapabilities.isMobile) {
      return this.options.bufferSize;
    }

    // Adjust buffer size based on device capabilities and power state
    let optimalSize = this.options.bufferSize;

    if (this.isLowPower) {
      optimalSize *= 2; // Larger buffers for power saving
    } else if (this.deviceCapabilities.hasLowLatencyAudio) {
      optimalSize = Math.min(optimalSize, 512); // Smaller buffers for low latency
    }

    // Ensure buffer size is a power of 2
    return Math.pow(2, Math.round(Math.log2(optimalSize)));
  }

  private updateWorkerConfig(): void {
    if (!this.worker) return;

    const config = {
      ...this.options,
      bufferSize: this.getOptimalBufferSize(),
      powerSaveMode: this.isLowPower
    };

    this.worker.postMessage({
      type: 'configure',
      data: config
    });
  }

  async initialize(stream: MediaStream): Promise<void> {
    this.mediaStream = stream;
    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    try {
      // Initialize battery monitoring
      await this.initializeBatteryMonitoring();

      // Initialize WebWorker if available
      if (this.deviceCapabilities.hasWebWorker) {
        this.worker = new Worker(new URL('../workers/vad.worker.ts', import.meta.url), {
          type: 'module'
        });

        // Set up worker message handlers
        const handleWorkerMessage = (event: MessageEvent) => this.handleWorkerMessage(event);
        const handleWorkerError = (error: ErrorEvent) => this.handleWorkerError(error);
        this.worker.onmessage = handleWorkerMessage;
        this.worker.onerror = handleWorkerError;

        // Configure worker with optimal settings
        this.updateWorkerConfig();
      }

      // Initialize audio context with Safari support
      await this.initializeAudioContext(stream);

      // Start performance monitoring
      this.startPerformanceMonitoring();
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Initialization failed'));
    }
  }

  private createDefaultAudioProcessor(): (e: AudioProcessingEvent) => void {
    return (e: AudioProcessingEvent) => {
      const audioData = e.inputBuffer.getChannelData(0);
      this.processAudioData(audioData);
    };
  }

  private createOptimizedAudioProcessor(): (e: AudioProcessingEvent) => void {
    let skipFrames = 0;
    const maxSkipFrames = this.isLowPower ? 2 : 0;

    return (e: AudioProcessingEvent) => {
      if (skipFrames > 0) {
        skipFrames--;
        return;
      }

      const audioData = e.inputBuffer.getChannelData(0);
      this.processAudioData(audioData);

      skipFrames = this.isLowPower ? maxSkipFrames : 0;
    };
  }

  private processAudioData(audioData: Float32Array): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'processAudio',
        data: audioData
      });
    } else {
      // Fallback processing if WebWorker is not available
      const rms = this.calculateRMS(audioData);
      const state: VADState = {
        speaking: rms > this.options.noiseThreshold,
        noiseLevel: rms,
        confidence: this.calculateConfidence(rms),
        lastActivity: Date.now()
      };
      this.notifyStateListeners(state);
    }
  }

  private calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private calculateConfidence(rms: number): number {
    if (rms <= this.options.noiseThreshold) return 0;
    if (rms >= this.options.silenceThreshold) return 1;
    return (rms - this.options.noiseThreshold) /
           (this.options.silenceThreshold - this.options.noiseThreshold);
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    switch (type) {
      case 'state':
        this.notifyStateListeners(data as VADState);
        break;
      case 'error':
        this.notifyError(data as Error);
        break;
      case 'metrics':
        this.handleMetricsUpdate(data as VADMetrics);
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    this.notifyError(error.error || new Error('Worker error'));
  }

  private handleMetricsUpdate(workerMetrics: VADMetrics): void {
    this.lastMetrics = {
      ...workerMetrics,
      deviceCapabilities: this.deviceCapabilities,
      batteryLevel: this.batteryManager?.level,
      isCharging: this.batteryManager?.charging,
      audioContextLatency: this.audioContext?.baseLatency
    };
    this.notifyMetricsListeners(this.lastMetrics);
  }

  private startPerformanceMonitoring(): void {
    if (this.worker) {
      this.metricsInterval = window.setInterval(() => {
        this.worker?.postMessage({ type: 'getMetrics', data: null });
      }, 1000) as unknown as number;
    }
  }

  addStateListener(listener: VADStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  removeStateListener(listener: VADStateListener): void {
    this.stateListeners.delete(listener);
  }

  addErrorListener(listener: VADErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  addMetricsListener(listener: VADMetricsListener): () => void {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  private notifyStateListeners(state: VADState): void {
    this.stateListeners.forEach(listener => listener(state));
  }

  private notifyError(error: Error): void {
    this.errorListeners.forEach(listener => listener(error));
  }

  private notifyMetricsListeners(metrics: VADPerformanceMetrics): void {
    this.metricsListeners.forEach(listener => listener(metrics));
  }

  private async initializeAudioContext(stream: MediaStream): Promise<void> {
    try {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // Safari requires specific sample rate
      const contextOptions: AudioContextOptions = {
        latencyHint: this.deviceCapabilities.isMobile ? 'balanced' : 'interactive',
        sampleRate: isSafari ? 44100 : this.options.sampleRate
      };

      this.audioContext = new AudioContext(contextOptions);

      // Handle Safari's suspended state requirement
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(
        this.getSafariOptimalBufferSize(),
        1,
        1
      );

      // Add Safari-specific optimizations
      if (isSafari) {
        this.setupSafariOptimizations();
      }

      processor.onaudioprocess = this.deviceCapabilities.isMobile ?
        this.createOptimizedAudioProcessor() :
        this.createDefaultAudioProcessor();

      source.connect(processor);
      processor.connect(this.audioContext.destination);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Audio initialization failed'));
    }
  }

  private getSafariOptimalBufferSize(): number {
    const isSafariMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isSafariMobile) {
      return 2048; // iOS Safari needs larger buffers
    }
    return this.getOptimalBufferSize();
  }

  private setupSafariOptimizations(): void {
    // Handle scroll events to reduce processing
    const handleScroll = () => {
      this.isProcessingPaused = true;

      if (this.scrollTimeout) {
        window.clearTimeout(this.scrollTimeout);
      }

      this.scrollTimeout = window.setTimeout(() => {
        this.isProcessingPaused = false;
      }, 100) as unknown as number;
    };

    const handleMemoryWarning = () => {
      this.cleanup();
    };

    const handleAudioInterruption = () => {
      if (this.audioContext?.state === 'interrupted' as AudioContextState) {
        this.notifyError(new Error('Audio session interrupted'));
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('memorywarning', handleMemoryWarning);

    if (this.audioContext) {
      this.audioContext.addEventListener('statechange', handleAudioInterruption);
    }

    // Store event listeners for cleanup
    this._eventListeners = {
      scroll: handleScroll,
      memorywarning: handleMemoryWarning,
      statechange: handleAudioInterruption
    };
  }

  private _eventListeners: {
    scroll: () => void;
    memorywarning: () => void;
    statechange: () => void;
  } | null = null;

  private cleanup(): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'cleanup',
        data: null
      });
    }
  }

  dispose(): void {
    // Clear scroll timeout
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }

    // Remove event listeners
    if (this._eventListeners) {
      window.removeEventListener('scroll', this._eventListeners.scroll);
      window.removeEventListener('memorywarning', this._eventListeners.memorywarning);

      if (this.audioContext) {
        this.audioContext.removeEventListener('statechange', this._eventListeners.statechange);
      }

      this._eventListeners = null;
    }

    // Clear performance monitoring
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Clear battery monitoring
    if (this.batteryManager) {
      const handleBatteryChange = () => this.handleBatteryChange();
      this.batteryManager.removeEventListener('levelchange', handleBatteryChange);
      this.batteryManager.removeEventListener('chargingchange', handleBatteryChange);
      this.batteryManager = null;
    }

    // Terminate worker
    if (this.worker) {
      this.worker.postMessage({ type: 'terminate' });
      this.worker = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear listeners
    this.stateListeners.clear();
    this.errorListeners.clear();
    this.metricsListeners.clear();
  }

  async start(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('VAD not initialized');
    }
    // Implementation details...
  }

  async stop(): Promise<void> {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.mediaStream = null;
  }
}
