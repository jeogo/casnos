import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  status?: string
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err }
  error.message = err.message

  // تم حذف السجل - لا داعي للطباعة هنا

  // Default safe error response
  let message = 'An error occurred while processing your request'
  let statusCode = 500

  // Handle specific known error types safely
  if (err.name === 'ValidationError') {
    message = 'Invalid input data provided'
    statusCode = 400
  }

  if (err.name === 'CastError') {
    message = 'Invalid identifier format'
    statusCode = 400
  }

  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid authentication token'
    statusCode = 401
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Authentication token has expired'
    statusCode = 401
  }

  if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    message = 'Invalid JSON format in request body'
    statusCode = 400
  }

  // Handle SQLite errors safely
  if (err.message && err.message.includes('SQLITE_')) {
    if (err.message.includes('CONSTRAINT')) {
      message = 'Data constraint violation'
      statusCode = 409
    } else if (err.message.includes('BUSY')) {
      message = 'Database is temporarily busy, please try again'
      statusCode = 503
    } else {
      message = 'Database operation failed'
      statusCode = 500
    }
  }

  // Handle operational errors (our custom errors)
  if (err.isOperational && err.statusCode) {
    statusCode = err.statusCode
    message = err.message
  }

  // Never expose sensitive information in production
  const isProduction = process.env.NODE_ENV === 'production'

  // Sanitize error messages to prevent information leakage
  if (isProduction) {
    // In production, provide generic error messages for server errors
    if (statusCode >= 500) {
      message = 'Internal server error'
    }

    // Remove any potential sensitive data from error messages
    message = message.replace(/\/[^\s]+/g, '[path]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]') // Remove IP addresses
      .replace(/password|token|secret|key/gi, '[sensitive]') // Remove sensitive keywords
  }

  // Standard error response format
  const errorResponse: any = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString()
    }
  }

  // Only include additional details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      originalMessage: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
      type: err.name
    }
  }

  res.status(statusCode).json(errorResponse)
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: 'The requested resource was not found',
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  })
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Ensure all async errors are properly caught
    if (!error.isOperational) {
      // Mark unexpected errors
      error.isOperational = false
    }
    next(error)
  })
}

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

// Input validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Basic request validation
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(createError('Request body is required', 400))
    }
  }

  // Check for common malicious patterns
  const userAgent = req.get('User-Agent') || ''
  if (userAgent.includes('sqlmap') || userAgent.includes('nikto')) {
    return next(createError('Request blocked', 403))
  }

  next()
}

// Rate limiting helper
export const createRateLimitError = (): AppError => {
  return createError('Too many requests, please try again later', 429)
}
