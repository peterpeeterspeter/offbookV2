import { AudioServiceState, AudioServiceEvent, AudioServiceError, AudioErrorCategory, type AudioServiceStateType, type AudioServiceEventType, type AudioServiceErrorType, type AudioErrorCategoryType, type AudioServiceContext, type AudioServiceSession, type AudioServiceStateData, type AudioErrorDetails } from '@/types/audio';
export type { AudioServiceState, AudioServiceEvent, AudioServiceError, AudioErrorCategory };
export type { AudioServiceStateType, AudioServiceEventType, AudioServiceErrorType, AudioErrorCategoryType, AudioServiceContext, AudioServiceSession, AudioServiceStateData, AudioErrorDetails };
declare const errorMessageMap: Record<keyof typeof AudioServiceError, string>;
export { errorMessageMap as ERROR_MESSAGES };
/**
 * Error recovery hints
 */
export declare const ERROR_RECOVERY_HINTS: Partial<Record<keyof typeof AudioServiceError, string>>;
/**
 * State manager for audio service
 */
export declare class AudioStateManager {
    private static instance;
    private state;
    private subscribers;
    private constructor();
    static getInstance(): AudioStateManager;
    getState(): AudioServiceStateData;
    subscribe(callback: (state: AudioServiceStateData) => void): () => void;
    transition(event: AudioServiceEventType, context?: Partial<AudioServiceStateData>): void;
    createError(code: AudioServiceErrorType, details?: {
        originalError?: Error | undefined;
    }): AudioErrorDetails;
    private getErrorCategory;
    private getErrorMessage;
    private isErrorRetryable;
    private notifySubscribers;
    restore(): void;
}
