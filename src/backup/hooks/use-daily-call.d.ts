import { DailyServiceConfig, DailyServiceMetrics } from '../lib/webrtc/daily-service';
interface UseDailyCallOptions extends DailyServiceConfig {
    onError?: (error: Error) => void;
    onMetricsUpdate?: (metrics: DailyServiceMetrics) => void;
}
interface UseDailyCallReturn {
    isConnected: boolean;
    isConnecting: boolean;
    audioEnabled: boolean;
    metrics: DailyServiceMetrics;
    error: Error | null;
    toggleAudio: () => Promise<void>;
    joinRoom: () => Promise<void>;
    leaveRoom: () => Promise<void>;
}
export declare function useDailyCall(options: UseDailyCallOptions): UseDailyCallReturn;
export {};
