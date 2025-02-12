export interface CollaboratorInfo {
    id: string;
    username: string;
    joinedAt: Date;
    isActive: boolean;
    role: string;
    currentLine: number | null;
    performanceMetrics: Record<string, unknown>;
}
export interface Session {
    id: string;
    scriptId: string;
    title: string;
    createdBy: string;
    createdAt: Date;
    collaborators: CollaboratorInfo[];
}
export interface CollaborationMetrics {
    activeUsers: number;
    averageLatency: number;
    messageCount: number;
    errorRate: number;
    syncDelay: number;
}
export interface CollaborationState {
    updates: Array<{
        type: string;
        data: Record<string, unknown>;
        timestamp: number;
    }>;
}
export interface CollaborationSession {
    id: string;
    name: string;
    hostId: string;
    updates: CollaborationUpdate[];
}
export interface CollaborationUpdate {
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
    userId: string;
    sessionId: string;
}
export interface CollaborationService {
    createSession(userId: number, name: string, role: string): Promise<CollaborationSession>;
    joinSession(sessionId: string, userId: string): Promise<void>;
    sendUpdate(sessionId: string, update: Omit<CollaborationUpdate, 'timestamp' | 'userId' | 'sessionId'>): Promise<void>;
    getState(sessionId: string): Promise<CollaborationSession>;
    reset(): void;
}
