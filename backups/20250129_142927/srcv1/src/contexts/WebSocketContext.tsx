import React, { createContext, useContext, useEffect, useState } from 'react'
import { wsService, WebSocketMessage } from '../lib/websocket'

interface WebSocketContextType {
  isConnected: boolean
  sendMessage: typeof wsService.send
  lastMessage: WebSocketMessage | null
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect()

    // Subscribe to messages
    const unsubscribe = wsService.subscribe((message) => {
      setLastMessage(message)
    })

    // Update connection status
    const handleOnline = () => {
      wsService.connect()
      setIsConnected(true)
    }
    const handleOffline = () => {
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      unsubscribe()
      wsService.disconnect()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const value = {
    isConnected,
    sendMessage: wsService.send.bind(wsService),
    lastMessage,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
} 