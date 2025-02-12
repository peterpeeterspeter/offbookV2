import { CollaborationSession, CollaborationUpdate } from '@/types/collaboration';
import { Dict } from '@/types/common';
export declare enum CollaborationEventType {
    JOIN = "join",
    LEAVE = "leave",
    LINE_COMPLETE = "line_complete",
    EMOTION_UPDATE = "emotion_update",
    TIMING_UPDATE = "timing_update",
    FEEDBACK = "feedback",
    ROLE_CHANGE = "role_change",
    PROGRESS_UPDATE = "progress_update",
    METRICS_UPDATE = "metrics_update",
    SESSION_TIMEOUT = "session_timeout"
}
export declare class CollaborationService {
    private static instance;
    private sessions;
    private eventListeners;
    private eventHistory;
    private sessionStates;
    private constructor();
    static getInstance(): CollaborationService;
    createSession(userId: number, name: string, role: string): Promise<CollaborationSession>;
    addCollaborator(userId: string, username: string, sessionId: string): Promise<void>;
    removeCollaborator(userId: string, sessionId: string): Promise<void>;
    joinSession(sessionId: string, userId: string): Promise<void>;
    sendUpdate(sessionId: string, update: Omit<CollaborationUpdate, 'timestamp' | 'userId' | 'sessionId'>): Promise<void>;
    getState(sessionId: string): Promise<CollaborationSession>;
    private emitEvent;
    reset(): void;
}
export interface CollaborationEvent {
    type: CollaborationEventType;
    userId: string;
    data: Dict;
    timestamp: Date;
}
export declare const collaborationService: CollaborationService;
