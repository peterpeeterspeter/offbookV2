import { Request, Response } from 'express'

const DAILY_API_KEY = process.env.VITE_DAILY_API_KEY || ''
const DAILY_DOMAIN = process.env.VITE_DAILY_DOMAIN || ''

export async function createRoom(req: Request, res: Response) {
  try {
    if (!DAILY_API_KEY || !DAILY_DOMAIN) {
      return res.status(500).json({
        message: 'Missing Daily.co configuration'
      })
    }

    const { name, properties } = req.body

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: name || `offbook-${Date.now()}`,
        properties: {
          max_participants: properties?.maxParticipants || 10,
          enable_chat: properties?.enableChat ?? true,
          start_audio_off: properties?.startAudioOff ?? false,
          start_video_off: true,
          enable_video: false,
          audio_only: true
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json({
        message: error.message || 'Failed to create room'
      })
    }

    const room = await response.json()
    return res.status(200).json({
      url: `https://${DAILY_DOMAIN}/${room.name}`,
      name: room.name
    })
  } catch (error) {
    console.error('Error creating Daily.co room:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}

export async function deleteRoom(req: Request, res: Response) {
  try {
    if (!DAILY_API_KEY) {
      return res.status(500).json({
        message: 'Missing Daily.co configuration'
      })
    }

    const { name } = req.params

    if (!name) {
      return res.status(400).json({
        message: 'Room name is required'
      })
    }

    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json({
        message: error.message || 'Failed to delete room'
      })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting Daily.co room:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
