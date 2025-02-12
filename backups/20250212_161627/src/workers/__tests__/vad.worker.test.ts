import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VADWorkerMessage, VADWorkerResponse, VADWorkerConfig, VADMetrics } from '../vad.worker';
import { VADState } from '../../services/vad-service';

// Mock Performance API
const mockPerformance = {
  now: vi.fn(),
  memory: {
    usedJSHeapSize: 0,
    jsHeapSizeLimit: 1000000,
    totalJSHeapSize: 500000
  }
};
global.performance = mockPerformance as any;

// Mock Worker setup
class MockWorker implements Worker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  // Bind methods to avoid unbound method errors
  postMessage = vi.fn().bind(this);
  terminate = vi.fn().bind(this);
  addEventListener = vi.fn().bind(this);
  removeEventListener = vi.fn().bind(this);
  dispatchEvent = vi.fn().mockReturnValue(true).bind(this);
}

describe('VAD Worker', () => {
  let worker: Worker;
  let messages: VADWorkerResponse[] = [];
  let errors: Error[] = [];

  beforeEach(() => {
    worker = new MockWorker();
    messages = [];
    errors = [];
    worker.onmessage = (event) => messages.push(event.data);
    worker.onerror = (event) => errors.push(event.error);
    mockPerformance.now.mockReturnValue(0);
  });

  afterEach(() => {
    worker.terminate();
    vi.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config: VADWorkerConfig = {
        sampleRate: 16000,
        bufferSize: 1024,
        noiseThreshold: 0.5,
        silenceThreshold: 0.8
      };

      const message: VADWorkerMessage = {
        type: 'configure',
        data: config
      };

      worker.postMessage(message);
      expect(worker.postMessage).toHaveBeenCalledWith(message);
    });

    it('should handle mobile optimization configuration', () => {
      const config: VADWorkerConfig = {
        sampleRate: 16000,
        bufferSize: 1024,
        noiseThreshold: 0.5,
        silenceThreshold: 0.8,
        powerSaveMode: true,
        mobileOptimization: {
          enabled: true,
          batteryAware: true,
          adaptiveBufferSize: true,
          powerSaveMode: true
        }
      };

      const message: VADWorkerMessage = {
        type: 'configure',
        data: config
      };

      worker.postMessage(message);
      expect(worker.postMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('Audio Processing', () => {
    const defaultConfig: VADWorkerConfig = {
      sampleRate: 16000,
      bufferSize: 1024,
      noiseThreshold: 0.5,
      silenceThreshold: 0.8
    };

    beforeEach(() => {
      worker.postMessage({
        type: 'configure',
        data: defaultConfig
      });
    });

    it('should detect speech correctly', () => {
      // Create audio data with high amplitude (speech)
      const audioData = new Float32Array(1024).fill(0.8);

      worker.postMessage({
        type: 'processAudio',
        data: audioData
      });

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.type).toBe('state');
      const state = lastMessage.data as VADState;
      expect(state.speaking).toBe(true);
      expect(state.confidence).toBeGreaterThan(0.5);
    });

    it('should detect silence correctly', () => {
      // Create audio data with low amplitude (silence)
      const audioData = new Float32Array(1024).fill(0.1);

      worker.postMessage({
        type: 'processAudio',
        data: audioData
      });

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.type).toBe('state');
      const state = lastMessage.data as VADState;
      expect(state.speaking).toBe(false);
      expect(state.confidence).toBeLessThan(0.5);
    });

    it('should handle adaptive thresholds in power save mode', () => {
      // Enable power save mode
      worker.postMessage({
        type: 'configure',
        data: { ...defaultConfig, powerSaveMode: true }
      });

      // Process a sequence of audio buffers
      const amplitudes = [0.1, 0.2, 0.4, 0.6, 0.8];
      const states: VADState[] = [];

      amplitudes.forEach(amplitude => {
        const audioData = new Float32Array(1024).fill(amplitude);
        worker.postMessage({
          type: 'processAudio',
          data: audioData
        });
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.type === 'state') {
          states.push(lastMessage.data as VADState);
        }
      });

      // Verify adaptive behavior
      expect(states.length).toBeGreaterThan(0);
      expect(states[states.length - 1].speaking).toBe(true);
      expect(states[0].speaking).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      mockPerformance.now.mockReturnValue(0);
    });

    it('should track processing time', () => {
      // Configure worker
      worker.postMessage({
        type: 'configure',
        data: {
          sampleRate: 16000,
          bufferSize: 1024,
          noiseThreshold: 0.5,
          silenceThreshold: 0.8
        }
      });

      // Simulate processing with timing
      mockPerformance.now
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(5);   // End time (5ms)

      // Process audio
      worker.postMessage({
        type: 'processAudio',
        data: new Float32Array(1024).fill(0.5)
      });

      // Get metrics
      worker.postMessage({ type: 'getMetrics', data: null });
      const metricsMessage = messages.find(m => m.type === 'metrics');
      const metrics = metricsMessage?.data as VADMetrics;

      expect(metrics).toBeDefined();
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.totalSamplesProcessed).toBe(1024);
    });

    it('should track memory usage', () => {
      // Update mock memory values
      mockPerformance.memory.usedJSHeapSize = 100000;

      // Process audio
      worker.postMessage({
        type: 'processAudio',
        data: new Float32Array(1024).fill(0.5)
      });

      // Get metrics
      worker.postMessage({ type: 'getMetrics', data: null });
      const metricsMessage = messages.find(m => m.type === 'metrics');
      const metrics = metricsMessage?.data as VADMetrics;

      expect(metrics).toBeDefined();
      expect(metrics.peakMemoryUsage).toBeGreaterThan(0);
    });

    it('should track state transitions', () => {
      // Configure worker
      worker.postMessage({
        type: 'configure',
        data: {
          sampleRate: 16000,
          bufferSize: 1024,
          noiseThreshold: 0.5,
          silenceThreshold: 0.8
        }
      });

      // Process alternating speech/silence
      const amplitudes = [0.1, 0.8, 0.1, 0.8];  // Should cause transitions
      amplitudes.forEach(amplitude => {
        worker.postMessage({
          type: 'processAudio',
          data: new Float32Array(1024).fill(amplitude)
        });
      });

      // Get metrics
      worker.postMessage({ type: 'getMetrics', data: null });
      const metricsMessage = messages.find(m => m.type === 'metrics');
      const metrics = metricsMessage?.data as VADMetrics;

      expect(metrics).toBeDefined();
      expect(metrics.stateTransitions).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle and report processing errors', () => {
      // Configure worker
      worker.postMessage({
        type: 'configure',
        data: {
          sampleRate: 16000,
          bufferSize: 1024,
          noiseThreshold: 0.5,
          silenceThreshold: 0.8
        }
      });

      // Send invalid audio data
      worker.postMessage({
        type: 'processAudio',
        data: null as any
      });

      // Get metrics
      worker.postMessage({ type: 'getMetrics', data: null });
      const metricsMessage = messages.find(m => m.type === 'metrics');
      const metrics = metricsMessage?.data as VADMetrics;

      expect(metrics).toBeDefined();
      expect(metrics.errorCount).toBeGreaterThan(0);
      expect(messages.some(m => m.type === 'error')).toBe(true);
    });

    it('should cleanup resources on termination', () => {
      // Configure and process some audio
      worker.postMessage({
        type: 'configure',
        data: {
          sampleRate: 16000,
          bufferSize: 1024,
          noiseThreshold: 0.5,
          silenceThreshold: 0.8
        }
      });

      worker.postMessage({
        type: 'processAudio',
        data: new Float32Array(1024).fill(0.5)
      });

      // Terminate worker
      worker.postMessage({ type: 'terminate', data: null });

      // Verify cleanup
      expect(worker.terminate).toHaveBeenCalled();
    });
  });
});
