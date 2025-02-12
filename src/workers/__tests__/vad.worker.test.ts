import { VADState } from '../../services/vad-service';

// Mock Web Worker
const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock Worker constructor
jest.mock('../../workers/vad.worker', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockWorker),
  };
});

describe('VAD Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default options', () => {
    const message = { type: 'init', options: {} };
    mockWorker.postMessage(message);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(message);
  });

  it('should process audio data', () => {
    const audioData = new Float32Array(2048);
    const message = { type: 'process', data: audioData };
    mockWorker.postMessage(message);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(message);
  });

  it('should handle state changes', () => {
    const newState: VADState = {
      speaking: true,
      confidence: 0.9,
      noiseLevel: 0.5,
      lastActivity: Date.now(),
    };
    const message = { type: 'setState', state: newState };
    mockWorker.postMessage(message);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(message);
  });

  it('should handle errors gracefully', () => {
    const errorMessage = 'Test error';
    const message = { type: 'error', error: new Error(errorMessage) };
    mockWorker.postMessage(message);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(message);
  });

  it('should cleanup resources on terminate', () => {
    mockWorker.terminate();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
