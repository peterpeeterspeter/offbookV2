"use client";

import type { ActionResponse } from '../types/actions'

interface DailyConfig {
  apiKey: string
  domain: string
}

function getBooleanValue(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true'
}

function getNumberValue(value: string | undefined, defaultValue: number): number {
  const parsed = value ? parseInt(value, 10) : defaultValue
  return isNaN(parsed) ? defaultValue : parsed
}

function getIceServers(value: string | undefined, defaultValue: RTCIceServer[]): RTCIceServer[] {
  if (!value) return defaultValue
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

interface CreateRoomParams {
  name?: string
  properties?: {
    maxParticipants?: number
    enableChat?: boolean
    startAudioOff?: boolean
    startVideoOff?: boolean
  }
}

interface CreateRoomResponse {
  url: string
  name: string
}

const config = {
  daily: {
    apiKey: process.env.NEXT_PUBLIC_DAILY_API_KEY,
    domain: process.env.NEXT_PUBLIC_DAILY_DOMAIN,
    roomUrl: process.env.NEXT_PUBLIC_DAILY_ROOM_URL,
  },
  ai: {
    elevenLabsKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    deepseekKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    emotion: {
      defaultTone: process.env.NEXT_PUBLIC_AI_DEFAULT_TONE || 'neutral',
      enableModulation: getBooleanValue(process.env.NEXT_PUBLIC_AI_ENABLE_EMOTION_MODULATION),
      intensityLevel: getNumberValue(process.env.NEXT_PUBLIC_AI_EMOTION_INTENSITY, 5),
    },
    speech: {
      offlineMode: getBooleanValue(process.env.NEXT_PUBLIC_AI_OFFLINE_MODE),
      whisperModel: process.env.NEXT_PUBLIC_AI_WHISPER_MODEL || 'tiny',
      cacheEnabled: getBooleanValue(process.env.NEXT_PUBLIC_AI_ENABLE_CACHE),
      maxCachedLines: getNumberValue(process.env.NEXT_PUBLIC_AI_MAX_CACHED_LINES, 10),
    },
  },
  audio: {
    sampleRate: getNumberValue(process.env.NEXT_PUBLIC_AUDIO_SAMPLE_RATE, 48000),
    vadThreshold: parseFloat(process.env.NEXT_PUBLIC_VAD_THRESHOLD || '0.5'),
    vadWindowSize: getNumberValue(process.env.NEXT_PUBLIC_VAD_WINDOW_SIZE, 30),
    enableNoiseSuppression: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_NOISE_SUPPRESSION),
    enableEchoCancellation: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_ECHO_CANCELLATION),
    enableAutoGain: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_AUTO_GAIN),
  },
  webrtc: {
    iceServers: getIceServers(
      process.env.NEXT_PUBLIC_ICE_SERVERS,
      [{ urls: ['stun:stun.l.google.com:19302'] }]
    ),
    enableMetrics: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_METRICS),
    metricsInterval: getNumberValue(process.env.NEXT_PUBLIC_METRICS_INTERVAL, 1000),
    maxReconnectAttempts: getNumberValue(process.env.NEXT_PUBLIC_MAX_RECONNECT_ATTEMPTS, 3),
    reconnectDelay: getNumberValue(process.env.NEXT_PUBLIC_RECONNECT_DELAY, 2000),
  },
  cache: {
    duration: getNumberValue(process.env.NEXT_PUBLIC_CACHE_DURATION, 3600),
    maxSize: getNumberValue(process.env.NEXT_PUBLIC_CACHE_MAX_SIZE, 100),
    enablePersistentCache: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE),
  },
  features: {
    enablePerformanceAnalytics: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_ANALYTICS),
    enableEmotionDetection: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_EMOTION_DETECTION),
    enableScriptAnalysis: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_SCRIPT_ANALYSIS),
    enableRealtimeFeedback: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_REALTIME_FEEDBACK),
    enableOfflineMode: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE),
    enableCollaboration: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_COLLABORATION),
  },
  collaboration: {
    enableRealtime: getBooleanValue(process.env.NEXT_PUBLIC_ENABLE_REALTIME_COLLAB),
    syncInterval: getNumberValue(process.env.NEXT_PUBLIC_COLLAB_SYNC_INTERVAL, 1000),
    rolePermissions: {
      canEditEmotions: getBooleanValue(process.env.NEXT_PUBLIC_COLLAB_CAN_EDIT_EMOTIONS),
      canModifyScript: getBooleanValue(process.env.NEXT_PUBLIC_COLLAB_CAN_MODIFY_SCRIPT),
    },
  },
  debug: {
    debugMode: getBooleanValue(process.env.NEXT_PUBLIC_DEBUG_MODE),
    debugAudio: getBooleanValue(process.env.NEXT_PUBLIC_DEBUG_AUDIO),
    debugWebRTC: getBooleanValue(process.env.NEXT_PUBLIC_DEBUG_WEBRTC),
    debugAI: getBooleanValue(process.env.NEXT_PUBLIC_DEBUG_AI),
    debugCollaboration: getBooleanValue(process.env.NEXT_PUBLIC_DEBUG_COLLAB),
  },
};

export const getDailyConfig = (): DailyConfig => {
  const apiKey = config.daily.apiKey
  const domain = config.daily.domain

  if (!apiKey) throw new Error('NEXT_PUBLIC_DAILY_API_KEY not found in environment variables')
  if (!domain) throw new Error('NEXT_PUBLIC_DAILY_DOMAIN not found in environment variables')

  return { apiKey, domain }
}

export async function createDailyRoom(params: CreateRoomParams): Promise<ActionResponse<CreateRoomResponse>> {
  try {
    const { apiKey, domain } = getDailyConfig()
    const roomName = params.name || `offbook-${Date.now()}`

    const response = await fetch(`https://api.daily.co/v1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          max_participants: params.properties?.maxParticipants || 10,
          enable_chat: params.properties?.enableChat ?? true,
          start_audio_off: params.properties?.startAudioOff ?? false,
          start_video_off: params.properties?.startVideoOff ?? false,
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hour expiry
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: `Failed to create Daily.co room: ${error.message || 'Unknown error'}`
      }
    }

    const room = await response.json()
    return {
      success: true,
      data: {
        url: `https://${domain}/${room.name}`,
        name: room.name
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Daily.co room'
    }
  }
}

export async function joinDailyRoom(roomName: string): Promise<ActionResponse<CreateRoomResponse>> {
  try {
    const { domain } = getDailyConfig()

    return {
      success: true,
      data: {
        url: `https://${domain}/${roomName}`,
        name: roomName
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join Daily.co room'
    }
  }
}
