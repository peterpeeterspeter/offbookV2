interface UseDailyCallProps {
    roomUrl: string;
    token?: string;
    userName: string;
    onError?: (error: Error) => void;
    audioConfig?: {
        sampleRate: number;
        echoCancellation: boolean;
        noiseSuppression: boolean;
        autoGainControl: boolean;
    };
}
interface CallMetrics {
    networkQuality: number;
    audioLevel: number;
    latency: number;
    packetLoss: number;
    jitter: number;
}
export declare function useDailyCall({ roomUrl, token, userName, onError, audioConfig }: UseDailyCallProps): {
    isConnected: boolean;
    isConnecting: boolean;
    audioEnabled: boolean;
    metrics: CallMetrics;
    error: Error | null;
    toggleAudio: () => Promise<void>;
    joinRoom: () => Promise<void>;
    leaveRoom: () => Promise<void>;
};
export {};
