import type { ActionResponse } from '@/types/actions'

interface CreateRoomParams {
  name?: string
  properties?: {
    maxParticipants?: number
    enableChat?: boolean
    startAudioOff?: boolean
  }
}

interface CreateRoomResponse {
  url: string
  name: string
  token?: string
}

export async function createRoom(params: CreateRoomParams): Promise<ActionResponse<CreateRoomResponse>> {
  try {
    const response = await fetch('/api/daily/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage = 'Failed to create room'
      try {
        const parsed = JSON.parse(errorData)
        errorMessage = parsed.error || parsed.message || errorMessage
      } catch {
        // If JSON parsing fails, use the raw text
        errorMessage = errorData || errorMessage
      }
      return {
        success: false,
        error: errorMessage
      }
    }

    const responseText = await response.text()
    if (!responseText) {
      return {
        success: false,
        error: 'Empty response from server'
      }
    }

    try {
      const data = JSON.parse(responseText)
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON response from server'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    }
  }
}

export async function deleteRoom(name: string): Promise<ActionResponse<void>> {
  try {
    const response = await fetch(`/api/daily/rooms/${name}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage = 'Failed to delete room'
      try {
        const parsed = JSON.parse(errorData)
        errorMessage = parsed.error || parsed.message || errorMessage
      } catch {
        errorMessage = errorData || errorMessage
      }
      return {
        success: false,
        error: errorMessage
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
