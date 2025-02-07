import { Emotion } from '../components/EmotionHighlighter'

interface CollaborationMessage {
  type: 'join' | 'leave' | 'update' | 'emotion' | 'cursor'
  userId: string
  data: {
    content?: string
    selection?: {
      text: string
      emotion: Emotion
      intensity: number
    }
    cursor?: {
      position: number
      username: string
    }
  }
  timestamp: number
}

interface WebSocketServiceConfig {
  url: string
  roomId: string
  userId: string
  username: string
  onMessage: (message: CollaborationMessage) => void
  onConnectionChange: (isConnected: boolean) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketServiceConfig
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 1000
  private heartbeatInterval: number | null = null
  private lastHeartbeat: number = Date.now()

  constructor(config: WebSocketServiceConfig) {
    this.config = config
    this.connect()
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.config.url)
      this.setupEventListeners()
      this.startHeartbeat()
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.handleReconnect()
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.config.onConnectionChange(true)
      
      // Join room
      this.send({
        type: 'join',
        userId: this.config.userId,
        data: {
          content: undefined,
          cursor: {
            position: 0,
            username: this.config.username
          }
        },
        timestamp: Date.now()
      })
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.config.onConnectionChange(false)
      this.handleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as CollaborationMessage
        if (message.userId !== this.config.userId) {
          this.config.onMessage(message)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
        
        // Check if we've missed too many heartbeats
        if (Date.now() - this.lastHeartbeat > 10000) {
          console.warn('Missed heartbeats, reconnecting...')
          this.reconnect()
        }
      }
    }, 5000)
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectTimeout * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  private reconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.connect()
  }

  send(message: CollaborationMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        roomId: this.config.roomId
      }))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  updateContent(content: string): void {
    this.send({
      type: 'update',
      userId: this.config.userId,
      data: { content },
      timestamp: Date.now()
    })
  }

  updateEmotion(text: string, emotion: Emotion, intensity: number): void {
    this.send({
      type: 'emotion',
      userId: this.config.userId,
      data: {
        selection: { text, emotion, intensity }
      },
      timestamp: Date.now()
    })
  }

  updateCursor(position: number): void {
    this.send({
      type: 'cursor',
      userId: this.config.userId,
      data: {
        cursor: {
          position,
          username: this.config.username
        }
      },
      timestamp: Date.now()
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.send({
        type: 'leave',
        userId: this.config.userId,
        data: {},
        timestamp: Date.now()
      })
      this.ws.close()
      this.ws = null
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }
}

export default WebSocketService 