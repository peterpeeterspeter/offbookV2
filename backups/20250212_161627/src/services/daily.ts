import type { ActionResponse } from '../types/actions'

interface DailyConfig {
  apiKey: string
  domain: string
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

export const getDailyConfig = (): DailyConfig => {
  const apiKey = import.meta.env.VITE_DAILY_API_KEY
  const domain = import.meta.env.VITE_DAILY_DOMAIN

  if (!apiKey) throw new Error('Daily.co API key not found in environment variables')
  if (!domain) throw new Error('Daily.co domain not found in environment variables')

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
