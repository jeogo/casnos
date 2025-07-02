import { Request, Response } from 'express'
import { windowOperations, serviceOperations } from '../db/database'
import { DatabaseWindow, CreateWindowRequest, AssignWindowServicesRequest } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { getSocketIO } from '../utils/socketInstance'

// Get all windows
export const getAllWindows = asyncHandler(async (req: Request, res: Response) => {
  const windows = windowOperations.getAll()

  res.json({
    success: true,
    count: windows.length,
    data: windows
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
    data: window
  })
})

// Create new window
export const createWindow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { label, active }: CreateWindowRequest & { active?: boolean } = req.body

  if (!label || label.trim().length === 0) {
    throw createError('Window label is required', 400)
  }

  if (label.length > 50) {
    throw createError('Window label must be less than 50 characters', 400)
  }

  // Check if window with same label already exists
  const existingWindows = windowOperations.getAll()
  const existingWindow = existingWindows.find(w => w.label.toLowerCase() === label.trim().toLowerCase())

  if (existingWindow) {
    res.status(200).json({
      success: true,
      data: existingWindow,
      message: 'Window already exists'
    })
    return
  }

  try {
    const newWindow = windowOperations.create({
      label: label.trim(),
      active: active !== undefined ? active : true
    })

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('window:created', newWindow)
    }

    res.status(201).json({
      success: true,
      data: newWindow
    })
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const allWindows = windowOperations.getAll()
      const foundWindow = allWindows.find(w => w.label.toLowerCase() === label.trim().toLowerCase())

      if (foundWindow) {
        res.status(200).json({
          success: true,
          data: foundWindow,
          message: 'Window already exists'
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Database constraint error'
      })
      return
    }
    throw error
  }
})

// Update window
export const updateWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)
  const { label, active }: Partial<CreateWindowRequest> & { active?: boolean } = req.body

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  if (label && label.trim().length === 0) {
    throw createError('Window label cannot be empty', 400)
  }

  if (label && label.length > 50) {
    throw createError('Window label must be less than 50 characters', 400)
  }

  try {
    const updateData: Partial<DatabaseWindow> = {}
    if (label !== undefined) updateData.label = label.trim()
    if (active !== undefined) updateData.active = active

    const updatedWindow = windowOperations.update(windowId, updateData)

    if (!updatedWindow) {
      throw createError('Window not found', 404)
    }

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('window:updated', updatedWindow)
    }

    res.json({
      success: true,
      data: updatedWindow
    })
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw createError('Window label already exists', 409)
    }
    throw error
  }
})

// Delete window
export const deleteWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  // Get window details before deletion for the event
  const windowToDelete = windowOperations.getById(windowId)

  const deleted = windowOperations.delete(windowId)

  if (!deleted) {
    throw createError('Window not found', 404)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('window:deleted', {
      id: windowId,
      label: windowToDelete?.label || 'Unknown Window',
      timestamp: new Date().toISOString()
    })
  }

  res.json({
    success: true,
    message: 'Window deleted successfully'
  })
})

// Get services assigned to window
export const getWindowServices = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  const window = windowOperations.getById(windowId)
  if (!window) {
    throw createError('Window not found', 404)
  }

  const services = windowOperations.getWindowServices(windowId)

  res.json({
    success: true,
    data: services
  })
})

// Assign services to window
export const assignServicesToWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)
  const { service_ids }: AssignWindowServicesRequest = req.body

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  if (!Array.isArray(service_ids)) {
    throw createError('Service IDs must be an array', 400)
  }

  const window = windowOperations.getById(windowId)
  if (!window) {
    throw createError('Window not found', 404)
  }

  // Validate all service IDs exist
  for (const serviceId of service_ids) {
    const service = serviceOperations.getById(serviceId)
    if (!service) {
      throw createError(`Service with ID ${serviceId} not found`, 404)
    }
  }

  try {
    windowOperations.assignServices(windowId, service_ids)
    const updatedServices = windowOperations.getWindowServices(windowId)

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('window:services-assigned', {
        windowId,
        windowLabel: window.label,
        services: updatedServices,
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      success: true,
      data: {
        window,
        services: updatedServices
      },
      message: 'Services assigned successfully'
    })
  } catch (error) {
    throw createError('Failed to assign services to window', 500)
  }
})
