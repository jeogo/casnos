import { Request, Response } from 'express'
import { windowOperations } from '../db/operations/windows'
import { DatabaseWindow, CreateWindowRequest } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { getConnectedDevices } from '../socket/handlers/device.handler'

// Get all windows
export const getAllWindows = asyncHandler(async (req: Request, res: Response) => {
  const windows = windowOperations.getAll()

  console.log('[WINDOW-CONTROLLER] 📊 Raw windows from DB:', JSON.stringify(windows, null, 2))

  // Get connected devices to check real-time status
  const connectedDevices = getConnectedDevices()
  const connectedDeviceIds = new Set(connectedDevices.map(d => d.deviceId))

  const processedWindows = windows.map(w => {
    // Check if the device is actually connected
    const isDeviceConnected = w.device_id ? connectedDeviceIds.has(w.device_id) : false

    return {
      ...w,
      active: Boolean(w.active) && isDeviceConnected, // Only active if both DB says active AND device is connected
      device_connected: isDeviceConnected, // Separate field to show actual device connection
      label: `شباك ${w.id}` // Generate label from ID
    }
  })

  console.log('[WINDOW-CONTROLLER] 📊 Processed windows with device status:', JSON.stringify(processedWindows, null, 2))

  res.json({
    success: true,
    count: windows.length,
    data: processedWindows
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
  const { service_id, device_id, active }: CreateWindowRequest = req.body

  try {
    const windowData: DatabaseWindow = {
      active: active !== false // Default to true if not specified
    }

    // Only add service_id if it's provided
    if (service_id !== undefined) {
      windowData.service_id = service_id
    }

    // Only add device_id if it's provided
    if (device_id !== undefined) {
      windowData.device_id = device_id
    }

    const newWindow = windowOperations.create(windowData)

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
  const { service_id, device_id, active } = req.body

  console.log('[WINDOW-CONTROLLER] 🔄 Updating window:', windowId, 'with data:', { service_id, device_id, active })

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  try {
    const updateData: Partial<DatabaseWindow> = {}
    if (service_id !== undefined) {
      updateData.service_id = service_id
      console.log('[WINDOW-CONTROLLER] 📝 Setting service_id:', service_id)
    }
    if (device_id !== undefined) {
      updateData.device_id = device_id
      console.log('[WINDOW-CONTROLLER] 📝 Setting device_id:', device_id)
    }
    if (active !== undefined) {
      updateData.active = Boolean(active) // Ensure it's a proper boolean
      console.log('[WINDOW-CONTROLLER] 📝 Setting active from', active, 'to', updateData.active)
    }

    console.log('[WINDOW-CONTROLLER] 📊 Final update data:', updateData)

    const updatedWindow = windowOperations.update(windowId, updateData)

    if (!updatedWindow) {
      throw createError('Window not found', 404)
    }

    console.log('[WINDOW-CONTROLLER] ✅ Window updated successfully:', updatedWindow)

    res.json({
      success: true,
      data: {
        ...updatedWindow,
        active: Boolean(updatedWindow.active), // Ensure returned value is boolean
        label: `شباك ${updatedWindow.id}` // Generate label from ID
      }
    })
  } catch (error: any) {
    console.error('[WINDOW-CONTROLLER] ❌ Update error:', error)
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

// Get windows by service ID
export const getWindowsByService = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.serviceId!)

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  const windows = windowOperations.getByServiceId(serviceId)

  res.json({
    success: true,
    count: windows.length,
    data: windows.map(w => ({
      ...w,
      label: `شباك ${w.id}`
    }))
  })
})

// Get active windows by service ID
export const getActiveWindowsByService = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.serviceId!)

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  const windows = windowOperations.getActiveByServiceId(serviceId)

  res.json({
    success: true,
    count: windows.length,
    data: windows.map(w => ({
      ...w,
      label: `شباك ${w.id}`
    }))
  })
})

// Assign service to window
export const assignServiceToWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)
  const { service_id } = req.body

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  if (!service_id || isNaN(parseInt(service_id))) {
    throw createError('Valid service ID is required', 400)
  }

  const updatedWindow = windowOperations.assignService(windowId, parseInt(service_id))

  if (!updatedWindow) {
    throw createError('Window not found', 404)
  }

  res.json({
    success: true,
    data: {
      ...updatedWindow,
      label: `شباك ${updatedWindow.id}`
    },
    message: 'Service assigned to window successfully'
  })
})

// Register or get window for device (idempotent operation)
export const registerDeviceWindow = asyncHandler(async (req: Request, res: Response) => {
  const { device_id, service_id } = req.body

  if (!device_id) {
    throw createError('Device ID is required', 400)
  }

  try {
    // Create or update window for this device
    const window = windowOperations.createOrUpdateForDevice(device_id, {
      service_id: service_id || null
    })

    res.json({
      success: true,
      data: {
        ...window,
        label: `شباك ${window.id}`
      },
      message: 'Window registered for device successfully'
    })
  } catch (error) {
    console.error('Error registering device window:', error)
    throw createError('Failed to register window for device', 500)
  }
})

// Get window by device ID
export const getWindowByDeviceId = asyncHandler(async (req: Request, res: Response) => {
  const deviceId = req.params.deviceId

  if (!deviceId) {
    throw createError('Device ID is required', 400)
  }

  const window = windowOperations.getByDeviceId(deviceId)

  if (!window) {
    throw createError('Window not found for this device', 404)
  }

  res.json({
    success: true,
    data: {
      ...window,
      label: `شباك ${window.id}`
    }
  })
})

// Activate window for device
export const activateDeviceWindow = asyncHandler(async (req: Request, res: Response) => {
  const deviceId = req.params.deviceId

  if (!deviceId) {
    throw createError('Device ID is required', 400)
  }

  const window = windowOperations.activateForDevice(deviceId)

  if (!window) {
    throw createError('Window not found for this device', 404)
  }

  res.json({
    success: true,
    data: {
      ...window,
      label: `شباك ${window.id}`
    },
    message: 'Window activated successfully'
  })
})

// Deactivate window for device
export const deactivateDeviceWindow = asyncHandler(async (req: Request, res: Response) => {
  const deviceId = req.params.deviceId

  if (!deviceId) {
    throw createError('Device ID is required', 400)
  }

  const window = windowOperations.deactivateForDevice(deviceId)

  if (!window) {
    throw createError('Window not found for this device', 404)
  }

  res.json({
    success: true,
    data: {
      ...window,
      label: `شباك ${window.id}`
    },
    message: 'Window deactivated successfully'
  })
})

// Remove service from window
export const removeServiceFromWindow = asyncHandler(async (req: Request, res: Response) => {
  const windowId = parseInt(req.params.id!)

  if (isNaN(windowId)) {
    throw createError('Invalid window ID', 400)
  }

  const updatedWindow = windowOperations.removeService(windowId)

  if (!updatedWindow) {
    throw createError('Window not found', 404)
  }

  res.json({
    success: true,
    data: {
      ...updatedWindow,
      label: `شباك ${updatedWindow.id}`
    },
    message: 'Service removed from window successfully'
  })
})
