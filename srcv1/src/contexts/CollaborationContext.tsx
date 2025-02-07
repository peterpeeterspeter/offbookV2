import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Emotion } from '../types'

interface CollaboratorData {
  username: string
  role?: 'editor' | 'viewer'
  cursor?: number
  selection?: {
    start: number
    end: number
  }
  lastActivity: number
}

interface CollaborationContextType {
  isConnected: boolean
  roomId: string | null
  userId: string | null
  collaborators: Map<string, CollaboratorData>
  connect: (roomId: string, username: string, role?: 'editor' | 'viewer') => void
  disconnect: () => void
  updateContent: (content: string) => void
  updateEmotion: (text: string, emotion: Emotion, intensity: number) => void
  updateCursor: (position: number) => void
  updateSelection: (start: number, end: number) => void
  canEdit: boolean
}

const CollaborationContext = createContext<CollaborationContextType | null>(null)

export const useCollaboration = () => {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider')
  }
  return context
}

interface CollaborationProviderProps {
  children: React.ReactNode
  wsUrl: string
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children, wsUrl }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer')
  const [collaborators, setCollaborators] = useState<Map<string, CollaboratorData>>(new Map())

  // Cleanup inactive collaborators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCollaborators(prev => {
        const newCollaborators = new Map(prev)
        for (const [id, data] of newCollaborators.entries()) {
          if (now - data.lastActivity > 30000) { // 30 seconds timeout
            newCollaborators.delete(id)
          }
        }
        return newCollaborators
      })
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Connect to WebSocket
  const connect = useCallback((newRoomId: string, username: string, userRole: 'editor' | 'viewer' = 'viewer') => {
    if (socket) {
      socket.close()
    }

    const ws = new WebSocket(wsUrl)
    setSocket(ws)

    ws.onopen = () => {
      setIsConnected(true)
      setRoomId(newRoomId)
      setRole(userRole)
      ws.send(JSON.stringify({
        type: 'join',
        roomId: newRoomId,
        username,
        role: userRole
      }))
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'joined':
          setUserId(message.userId)
          setCollaborators(prev => {
            const newCollaborators = new Map(prev)
            newCollaborators.set(message.userId, {
              username: message.username,
              role: message.role,
              lastActivity: Date.now()
            })
            return newCollaborators
          })
          break

        case 'user_joined':
          setCollaborators(prev => {
            const newCollaborators = new Map(prev)
            newCollaborators.set(message.userId, {
              username: message.username,
              role: message.role,
              lastActivity: Date.now()
            })
            return newCollaborators
          })
          break

        case 'user_left':
          setCollaborators(prev => {
            const newCollaborators = new Map(prev)
            newCollaborators.delete(message.userId)
            return newCollaborators
          })
          break

        case 'content_update':
          if (message.userId !== userId) {
            // Handle content update from other users
            document.dispatchEvent(new CustomEvent('remote_content_update', {
              detail: { content: message.content }
            }))
          }
          break

        case 'emotion_update':
          if (message.userId !== userId) {
            // Handle emotion update from other users
            document.dispatchEvent(new CustomEvent('remote_emotion_update', {
              detail: {
                text: message.text,
                emotion: message.emotion,
                intensity: message.intensity
              }
            }))
          }
          break

        case 'cursor_update':
          if (message.userId !== userId) {
            setCollaborators(prev => {
              const newCollaborators = new Map(prev)
              const collaborator = newCollaborators.get(message.userId)
              if (collaborator) {
                newCollaborators.set(message.userId, {
                  ...collaborator,
                  cursor: message.position,
                  lastActivity: Date.now()
                })
              }
              return newCollaborators
            })
          }
          break

        case 'selection_update':
          if (message.userId !== userId) {
            setCollaborators(prev => {
              const newCollaborators = new Map(prev)
              const collaborator = newCollaborators.get(message.userId)
              if (collaborator) {
                newCollaborators.set(message.userId, {
                  ...collaborator,
                  selection: {
                    start: message.start,
                    end: message.end
                  },
                  lastActivity: Date.now()
                })
              }
              return newCollaborators
            })
          }
          break
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setRoomId(null)
      setUserId(null)
      setCollaborators(new Map())
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      ws.close()
    }
  }, [wsUrl])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close()
    }
  }, [socket])

  const updateContent = useCallback((content: string) => {
    if (socket && isConnected && role === 'editor') {
      socket.send(JSON.stringify({
        type: 'content_update',
        content,
        roomId
      }))
    }
  }, [socket, isConnected, roomId, role])

  const updateEmotion = useCallback((text: string, emotion: Emotion, intensity: number) => {
    if (socket && isConnected && role === 'editor') {
      socket.send(JSON.stringify({
        type: 'emotion_update',
        text,
        emotion,
        intensity,
        roomId
      }))
    }
  }, [socket, isConnected, roomId, role])

  const updateCursor = useCallback((position: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'cursor_update',
        position,
        roomId
      }))
    }
  }, [socket, isConnected, roomId])

  const updateSelection = useCallback((start: number, end: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'selection_update',
        start,
        end,
        roomId
      }))
    }
  }, [socket, isConnected, roomId])

  const value = {
    isConnected,
    roomId,
    userId,
    collaborators,
    connect,
    disconnect,
    updateContent,
    updateEmotion,
    updateCursor,
    updateSelection,
    canEdit: role === 'editor'
  }

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  )
} 