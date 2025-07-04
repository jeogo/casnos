import { Request, Response } from 'express'
import { windowOperations } from '../db/operations/windows'
import { DatabaseWindow } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'

// Get all windows
export const getAllWindows = asyncHandler(async (req: Request, res: Response) => {
  const windows = windowOperations.getAll()
  res.json({
    success: true,
    count: windows.length,
    data: windows.map(w => ({
      ...w,
      label: `شباك ${w.id}` // Generate label from ID
    }))
  })
})

// Get window by ID
export const getWindowById = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  const window = windowOperations.getById(windowId)

  if (!window) {
    throw createError('Window not found', 404)
  }

  res.json({
    success: true,
    data: {
      ...window,
      label: `شباك ${window.id}` // Generate label from ID
    }
  })
})

// Create new window
export const createWindow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { active }: DatabaseWindow = req.body

  try {
    const newWindow = windowOperations.create({
      active: active !== false // Default to true if not specified
    })

    res.status(201).json({
      success: true,
      data: {
        ...newWindow,
        label: `شباك ${newWindow.id}` // Generate label from ID
      }
    })
  } catch (error: any) {
    throw error
  }
})

// Update window
export const updateWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)
  const { active } = req.body

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  try {
    const updateData: Partial<DatabaseWindow> = {}
    if (active !== undefined) {
      updateData.active = active
    }

    const updatedWindow = windowOperations.update(windowId, updateData)

    if (!updatedWindow) {
      throw createError('Window not found', 404)
    }

    res.json({
      success: true,
      data: {
        ...updatedWindow,
        label: `شباك ${updatedWindow.id}` // Generate label from ID
      }
    })
  } catch (error: any) {
    throw error
  }
})

// Delete window
export const deleteWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  const deleted = windowOperations.delete(windowId)

  if (!deleted) {
    throw createError('Window not found', 404)
  }

  res.json({
    success: true,
    message: 'Window deleted successfully'
  })
})

// Create window with auto-assigned number
export const createWindowWithAutoNumber = asyncHandler(async (req: Request, res: Response) => {
  try {
    const newWindow = windowOperations.create({
      active: true
    })

    res.status(201).json({
      success: true,
      data: {
        ...newWindow,
        label: `شباك ${newWindow.id}` // Generate label from ID
      },
      message: 'Window registered successfully'
    })
  } catch (error) {
    console.error('Error creating auto-numbered window:', error)
    throw createError('Failed to create window', 500)
  }
})

// Get active windows only
export const getActiveWindows = asyncHandler(async (req: Request, res: Response) => {
  const windows = windowOperations.getActiveWindows()

  res.json({
    success: true,
    count: windows.length,
    data: windows.map(w => ({
      ...w,
      label: `شباك ${w.id}` // Generate label from ID
    }))
  })
})
