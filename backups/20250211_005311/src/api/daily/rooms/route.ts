import { NextResponse } from 'next/server'
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
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateRoomParams
    const apiKey = import.meta.env.VITE_DAILY_API_KEY
    const domain = import.meta.env.VITE_DAILY_DOMAIN

    if (!apiKey || !domain) {
      return NextResponse.json(
        { success: false, error: 'Missing Daily.co configuration' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
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
          start_video_off: true,
          enable_video: false,
          audio_only: true,
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hour expiry
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { success: false, error: `Failed to create Daily.co room: ${error.message || 'Unknown error'}` },
        { status: response.status }
      )
    }

    const room = await response.json()
    return NextResponse.json({
      success: true,
      data: {
        url: `https://${domain}/${room.name}`,
        name: room.name
      }
    })
  } catch (error) {
    console.error('Error creating Daily.co room:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create room' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const name = url.searchParams.get('name')

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Room name is required' },
        { status: 400 }
      )
    }

    const apiKey = import.meta.env.VITE_DAILY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Daily.co configuration' },
        { status: 500 }
      )
    }

    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { success: false, error: `Failed to delete room: ${error.message || 'Unknown error'}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Daily.co room:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete room' },
      { status: 500 }
    )
  }
}
