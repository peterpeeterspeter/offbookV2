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

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface CacheEntry {
  timestamp: number;
  transcription: string;
}

export class WhisperService {
  private deviceCapabilities: DeviceCapabilities;
  private batteryManager: BatteryManager | null = null;
  private isLowPower: boolean = false;
  private isOffline: boolean = false;
  private isBackgrounded: boolean = false;
  private currentQualityLevel: QualityLevel = 'high';
  private socket: WebSocket | null = null;
  private transcriptionCache = new Map<string, CacheEntry>();
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
    const handleVisibilityChange = () => this.handleVisibilityChange();
    const handleMemoryWarning = () => this.handleMemoryWarning();
    const handleAudioInterruption = (event: Event) => this.handleAudioInterruption(event);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('memorywarning', handleMemoryWarning);
    window.addEventListener('audiointerruption', handleAudioInterruption);
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
    this.transcriptionCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.transcriptionCache.delete(key);
      }
    });
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

        // Update quality level with conservative settings
        this.updateQualityLevel();
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
      const handleNetworkChange = () => this.handleNetworkChange();
      connection.addEventListener('change', handleNetworkChange);
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
    const handleWebSocketError = (event: Event) => this.handleWebSocketError(event);
    const handleWebSocketClose = (event: Event) => this.handleWebSocketClose(event);
    this.socket.addEventListener('error', handleWebSocketError);
    this.socket.addEventListener('close', handleWebSocketClose);
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
      const handleBatteryChange = () => this.handleBatteryChange();
      this.batteryManager.removeEventListener('levelchange', handleBatteryChange);
      this.batteryManager.removeEventListener('chargingchange', handleBatteryChange);
    }

    if (this.deviceCapabilities.hasNetworkInfo) {
      const handleNetworkChange = () => this.handleNetworkChange();
      (navigator as any).connection.removeEventListener('change', handleNetworkChange);
    }

    const handleVisibilityChange = () => this.handleVisibilityChange();
    const handleMemoryWarning = () => this.handleMemoryWarning();
    const handleAudioInterruption = (event: Event) => this.handleAudioInterruption(event);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('memorywarning', handleMemoryWarning);
    window.removeEventListener('audiointerruption', handleAudioInterruption);

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
