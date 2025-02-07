import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, z } from 'zod'

interface ValidationConfig {
  body?: AnyZodObject
  query?: AnyZodObject
  params?: AnyZodObject
}

export const validateRequest = (schemas: ValidationConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query)
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params)
      }
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          details: error.errors
        })
      } else {
        next(error)
      }
    }
  }
}
