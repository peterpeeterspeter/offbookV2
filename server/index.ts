import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { createDailyRoom } from '../src/lib/daily'
import { errorHandler } from './middleware/error-handler'
import { validateRequest } from './middleware/validate-request'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request validation schemas
const createRoomSchema = z.object({
  name: z.string().optional(),
  properties: z.object({
    start_audio_off: z.boolean().optional(),
    start_video_off: z.boolean().optional(),
  }).optional(),
})

// Routes
app.post(
  '/api/daily/rooms',
  validateRequest({ body: createRoomSchema }),
  async (req, res) => {
    try {
      const room = await createDailyRoom(req.body)
      res.json(room)
    } catch (error) {
      console.error('Failed to create Daily room:', error)
      res.status(500).json({
        error: 'Failed to create room',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

// Error handling
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})

export default app
