interface DailyServiceConfig {
    url: string;
    token?: string;
    userName: string;
    audioConfig?: MediaTrackConstraints;
}
export declare class DailyService {
    private daily;
    private retryCount;
    private maxRetries;
    initialize(config: DailyServiceConfig): Promise<void>;
    private joinWithRetry;
    private configureAudio;
    setAudioEnabled(enabled: boolean): Promise<boolean>;
    destroy(): void;
    private createError;
    private handleError;
}
export {};
