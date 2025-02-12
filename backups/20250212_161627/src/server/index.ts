import express from 'express'
import { createRoom, deleteRoom } from './api/daily/rooms'

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }
  next()
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  })
})

// Daily.co API routes
app.post('/api/daily/rooms', createRoom)
app.delete('/api/daily/rooms/:name', deleteRoom)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

export const handler = app
