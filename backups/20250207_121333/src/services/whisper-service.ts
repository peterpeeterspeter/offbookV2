export interface WhisperOptions {
  websocketUrl: string;
  mobileOptimization?: {
    enabled: boolean;
    batteryAware: boolean;
    adaptiveQuality: boolean;
    networkAware: boolean;
  };
}

interface DeviceCapabilities {
  isMobile: boolean;
  cpuCores: number;
  hasBatteryAPI: boolean;
  hasLowLatencyAudio: boolean;
  hasNetworkInfo: boolean;
}

type QualityLevel = 'low' | 'medium' | 'high';

export class WhisperService {
  private deviceCapabilities: DeviceCapabilities;
  private batteryManager: any;
  private isLowPower: boolean = false;
  private isOffline: boolean = false;
  private isBackgrounded: boolean = false;
  private currentQualityLevel: QualityLevel = 'high';
  private socket: WebSocket | null = null;
  private transcriptionCache = new Map<string, any>();
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly QUALITY_CHANGE_DEBOUNCE = 100; // ms
  private qualityChangeTimeout: NodeJS.Timeout | null = null;

  constructor(private options: WhisperOptions) {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.initializeVisibilityTracking();
  }

  private initializeVisibilityTracking(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('memorywarning', this.handleMemoryWarning.bind(this));
    window.addEventListener('audiointerruption', this.handleAudioInterruption.bind(this));
  }

  private handleVisibilityChange(): void {
    this.isBackgrounded = document.visibilityState === 'hidden';
    this.updateQualityLevel();
  }

  private handleMemoryWarning(): void {
    this.transcriptionCache.clear();
    this.updateQualityLevel();
  }

  private handleAudioInterruption(event: Event): void {
    this.onError?.(new Error('Audio session interrupted'));
    this.updateQualityLevel();
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.transcriptionCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.transcriptionCache.delete(key);
      }
    }
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    const userAgent = navigator.userAgent.toLowerCase();
    return {
      isMobile: /iphone|ipad|ipod|android/.test(userAgent),
      cpuCores: navigator.hardwareConcurrency || 1,
      hasBatteryAPI: 'getBattery' in navigator,
      hasLowLatencyAudio: 'AudioContext' in window,
      hasNetworkInfo: 'connection' in navigator
    };
  }

  public async initialize(): Promise<void> {
    if (this.options.mobileOptimization?.enabled) {
      await this.initializeMobileOptimizations();
    }
    this.initializeWebSocket();
  }

  private async initializeMobileOptimizations(): Promise<void> {
    if (this.options.mobileOptimization?.batteryAware) {
      await this.initializeBatteryMonitoring();
    }
    if (this.options.mobileOptimization?.networkAware) {
      this.initializeNetworkMonitoring();
    }
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    if (this.deviceCapabilities.hasBatteryAPI) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
        this.batteryManager.addEventListener('levelchange', this.handleBatteryChange.bind(this));
        this.batteryManager.addEventListener('chargingchange', this.handleBatteryChange.bind(this));
        this.handleBatteryChange();
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  private handleBatteryChange(): void {
    if (!this.batteryManager) return;

    const isLowPower = this.batteryManager.level < 0.2 && !this.batteryManager.charging;
    if (isLowPower !== this.isLowPower) {
      this.isLowPower = isLowPower;
      this.updateQualityLevel();
    }
  }

  private initializeNetworkMonitoring(): void {
    if (this.deviceCapabilities.hasNetworkInfo) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleNetworkChange.bind(this));
      this.handleNetworkChange();
    }
  }

  private handleNetworkChange(): void {
    const connection = (navigator as any).connection;
    this.isOffline = connection.type === 'none';
    this.updateQualityLevel();
  }

  private updateQualityLevel(): void {
    if (this.qualityChangeTimeout) {
      clearTimeout(this.qualityChangeTimeout);
    }

    this.qualityChangeTimeout = setTimeout(() => {
      let newLevel: QualityLevel = 'high';

      if (this.isBackgrounded || this.isOffline || this.isLowPower) {
        newLevel = 'low';
      } else {
        const connection = (navigator as any).connection;
        if (connection) {
          switch (connection.type) {
            case '4g':
            case 'wifi':
              newLevel = 'high';
              break;
            case '3g':
              newLevel = 'medium';
              break;
            default:
              newLevel = 'low';
          }
        }
      }

      if (this.currentQualityLevel !== newLevel) {
        this.currentQualityLevel = newLevel;
        this.onQualityChange?.(newLevel);
      }
    }, this.QUALITY_CHANGE_DEBOUNCE);
  }

  private getOptimalChunkSize(): number {
    let baseSize = 4096;

    if (this.deviceCapabilities.isMobile) {
      baseSize = this.isLowPower ? 8192 : 4096;

      if (this.currentQualityLevel === 'low') {
        baseSize *= 2;
      }
    }

    return baseSize;
  }

  private initializeWebSocket(): void {
    this.socket = new WebSocket(this.options.websocketUrl);
    this.socket.addEventListener('error', this.handleWebSocketError.bind(this));
    this.socket.addEventListener('close', this.handleWebSocketClose.bind(this));
  }

  private handleWebSocketError(event: Event): void {
    this.onError?.(new Error('WebSocket error occurred'));
    this.updateQualityLevel();
  }

  private handleWebSocketClose(event: Event): void {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.initializeWebSocket();
    }
    this.updateQualityLevel();
  }

  public dispose(): void {
    if (this.batteryManager) {
      this.batteryManager.removeEventListener('levelchange', this.handleBatteryChange);
      this.batteryManager.removeEventListener('chargingchange', this.handleBatteryChange);
    }

    if (this.deviceCapabilities.hasNetworkInfo) {
      (navigator as any).connection.removeEventListener('change', this.handleNetworkChange);
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('memorywarning', this.handleMemoryWarning);
    window.removeEventListener('audiointerruption', this.handleAudioInterruption);

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.qualityChangeTimeout) {
      clearTimeout(this.qualityChangeTimeout);
    }

    this.transcriptionCache.clear();
  }

  // Callbacks
  public onQualityChange?: (level: QualityLevel) => void;
  public onError?: (error: Error) => void;

  public async transcribeAudio(blob: Blob): Promise<string> {
    if (this.isBackgrounded) {
      return Promise.reject(new Error('Cannot process audio while in background'));
    }

    // Implement throttling based on device memory
    if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.processAudio(blob);
  }

  private async processAudio(blob: Blob): Promise<string> {
    // Implementation details...
    return 'transcription';
  }
}
