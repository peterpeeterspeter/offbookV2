import { CollaboratorInfo, Session, CollaborationSession, CollaborationUpdate } from '@/types/collaboration'
import { Dict } from '@/types/common'
import { v4 as uuidv4 } from 'uuid'

export enum CollaborationEventType {
  JOIN = 'join',
  LEAVE = 'leave',
  LINE_COMPLETE = 'line_complete',
  EMOTION_UPDATE = 'emotion_update',
  TIMING_UPDATE = 'timing_update',
  FEEDBACK = 'feedback',
  ROLE_CHANGE = 'role_change',
  PROGRESS_UPDATE = 'progress_update',
  METRICS_UPDATE = 'metrics_update',
  SESSION_TIMEOUT = 'session_timeout'
}

export class CollaborationService {
  private static instance: CollaborationService
  private sessions: Dict<Dict<CollaboratorInfo>> = {}
  private eventListeners: Dict<Set<(event: CollaborationEvent) => void>> = {}
  private eventHistory: CollaborationEvent[] = []
  private sessionStates: Dict<CollaborationSession> = {}

  private constructor() {
    // Initialize event listener sets
    Object.values(CollaborationEventType).forEach(type => {
      this.eventListeners[type] = new Set()
    })
  }

  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService()
    }
    return CollaborationService.instance
  }

  async createSession(userId: number, name: string, role: string): Promise<CollaborationSession> {
    const sessionId = uuidv4()
    this.sessions[sessionId] = {}

    const session: CollaborationSession = {
      id: sessionId,
      name,
      hostId: userId.toString(),
      updates: []
    }

    this.sessionStates[sessionId] = session
    await this.addCollaborator(userId.toString(), role, sessionId)
    return session
  }

  async addCollaborator(userId: string, username: string, sessionId: string): Promise<void> {
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = {}
    }

    if (Object.keys(this.sessions[sessionId]).length >= 4) {
      throw new Error('Session is full')
    }

    const collaborator: CollaboratorInfo = {
      id: userId,
      username,
      joinedAt: new Date(),
      isActive: true,
      role: 'viewer',
      currentLine: null,
      performanceMetrics: {}
    }

    this.sessions[sessionId][userId] = collaborator
    await this.emitEvent(CollaborationEventType.JOIN, userId, { sessionId, username })
  }

  async removeCollaborator(userId: string, sessionId: string): Promise<void> {
    if (this.sessions[sessionId]?.[userId]) {
      delete this.sessions[sessionId][userId]
      await this.emitEvent(CollaborationEventType.LEAVE, userId, { sessionId })
    }
  }

  async joinSession(sessionId: string, userId: string): Promise<void> {
    if (!this.sessions[sessionId]) {
      throw new Error('Session not found')
    }

    await this.addCollaborator(userId, 'viewer', sessionId)
  }

  async sendUpdate(sessionId: string, update: Omit<CollaborationUpdate, 'timestamp' | 'userId' | 'sessionId'>): Promise<void> {
    if (!this.sessionStates[sessionId]) {
      throw new Error('Session not found')
    }

    const fullUpdate: CollaborationUpdate = {
      ...update,
      timestamp: Date.now(),
      userId: 'system',
      sessionId
    }

    this.sessionStates[sessionId].updates.push(fullUpdate)
    await this.emitEvent(CollaborationEventType.PROGRESS_UPDATE, 'system', {
      type: fullUpdate.type,
      data: fullUpdate.data,
      timestamp: fullUpdate.timestamp,
      sessionId: fullUpdate.sessionId
    })
  }

  async getState(sessionId: string): Promise<CollaborationSession> {
    if (!this.sessionStates[sessionId]) {
      throw new Error('Session not found')
    }
    return this.sessionStates[sessionId]
  }

  private async emitEvent(
    type: CollaborationEventType,
    userId: string,
    data: Dict
  ): Promise<void> {
    const event: CollaborationEvent = {
      type,
      userId,
      data,
      timestamp: new Date()
    }

    this.eventHistory.push(event)

    const listeners = this.eventListeners[type] || new Set()
    await Promise.all(
      Array.from(listeners).map(listener => listener(event))
    )
  }

  reset(): void {
    this.sessions = {}
    this.eventHistory = []
    this.sessionStates = {}
    Object.values(CollaborationEventType).forEach(type => {
      this.eventListeners[type] = new Set()
    })
  }
}

export interface CollaborationEvent {
  type: CollaborationEventType
  userId: string
  data: Dict
  timestamp: Date
}

// Export singleton instance
export const collaborationService = CollaborationService.getInstance()
