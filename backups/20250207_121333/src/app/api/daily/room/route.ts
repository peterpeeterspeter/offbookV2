import type { ActionResponse } from '@/types/actions'

export async function createRoom(request: Request) {
  try {
    const body = await request.json()
    const apiKey = import.meta.env.VITE_DAILY_API_KEY
    const domain = import.meta.env.VITE_DAILY_DOMAIN

    if (!apiKey || !domain) {
      return {
        success: false,
        error: 'Missing Daily.co configuration'
      }
    }

    const response = await fetch(`https://api.daily.co/v1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: body.name || `offbook-${Date.now()}`,
        properties: {
          max_participants: body.properties?.maxParticipants || 10,
          enable_chat: body.properties?.enableChat ?? true,
          start_audio_off: body.properties?.startAudioOff ?? false,
          start_video_off: body.properties?.startVideoOff ?? false,
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
      error: error instanceof Error ? error.message : 'Failed to create room'
    }
  }
}

export async function deleteRoom(name: string) {
  try {
    const apiKey = import.meta.env.VITE_DAILY_API_KEY

    if (!name) {
      return {
        success: false,
        error: 'Room name is required'
      }
    }

    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: `Failed to delete room: ${error.message || 'Unknown error'}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete room'
    }
  }
}
