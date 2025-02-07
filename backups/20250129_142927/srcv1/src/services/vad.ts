// Add back the interface definition
interface VADOptions {
  timeThreshold?: number;  // Silence threshold in ms
  volumeThreshold?: number;  // Volume threshold (0-1)
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSilence?: (duration: number) => void;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyzer: AnalyserNode | null = null;
  private options: Required<VADOptions>;
  private isSpeaking: boolean = false;
  private lastVoiceTime: number = 0;
  private animationFrame: number | null = null;

  constructor(options: VADOptions) {
    this.options = {
      timeThreshold: 500,    // Default 500ms silence threshold
      volumeThreshold: 0.2,  // Default volume threshold
      onSpeechStart: () => {},
      onSpeechEnd: () => {},
      onSilence: () => {},
      ...options
    };
  }

  async start(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Initialize audio context
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyzer = this.audioContext.createAnalyser();
      
      // Configure analyzer
      this.analyzer.fftSize = 1024;
      this.analyzer.smoothingTimeConstant = 0.5;
      
      // Connect nodes
      source.connect(this.analyzer);
      
      // Start monitoring
      this.monitor();
    } catch (error) {
      console.error('Failed to initialize VAD:', error);
      throw error;
    }
    return Promise.resolve();
  }

  private monitor(): void {
    if (!this.analyzer) return;

    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    
    const analyze = () => {
      this.analyzer!.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedVolume = average / 255;  // Normalize to 0-1
      
      const now = Date.now();
      
      if (normalizedVolume > this.options.volumeThreshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.options.onSpeechStart();
        }
        this.lastVoiceTime = now;
      } else {
        const silenceDuration = now - this.lastVoiceTime;
        
        if (this.isSpeaking && silenceDuration > this.options.timeThreshold) {
          this.isSpeaking = false;
          this.options.onSpeechEnd();
          this.options.onSilence(silenceDuration);
        }
      }
      
      this.animationFrame = requestAnimationFrame(analyze);
    };
    
    this.animationFrame = requestAnimationFrame(analyze);
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyzer = null;
    this.isSpeaking = false;
  }

  // Utility method to check if user is currently speaking
  isActive(): boolean {
    return this.isSpeaking;
  }

  // Method to adjust sensitivity thresholds
  updateOptions(options: Partial<VADOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
}

export default VoiceActivityDetector; 