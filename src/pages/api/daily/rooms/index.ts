import type { NextApiRequest, NextApiResponse } from 'next'
import { createDailyRoom } from '@/services/daily'
import type { ActionResponse } from '@/types/actions'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResponse>
) {
  if (req.method === 'POST') {
    try {
      const result = await createDailyRoom(req.body)
      return res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create room'
      })
    }
  }

  if (req.method === 'DELETE') {
    const { name } = req.query
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      })
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_DAILY_API_KEY
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Missing Daily.co configuration'
        })
      }

      const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        return res.status(response.status).json({
          success: false,
          error: `Failed to delete room: ${error.message || 'Unknown error'}`
        })
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete room'
      })
    }
  }

  return res.status(405).json({
    success: false,
    error: `Method ${req.method} not allowed`
  })
}



