import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

interface AppError extends Error {
  statusCode?: number
  details?: unknown
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  const details = err.details || undefined

  res.status(statusCode).json({
    error: message,
    details
  })
}
