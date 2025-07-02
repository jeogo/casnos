import { Request, Response } from 'express'
import { serviceOperations } from '../db/database'
import { CreateServiceRequest } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { getSocketIO } from '../utils/socketInstance'

export const getAllServices = asyncHandler(async (req: Request, res: Response) => {
  const services = serviceOperations.getAll()

  res.json({
    success: true,
    count: services.length,
    data: services
  })
})

export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id!)

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  const service = serviceOperations.getById(serviceId)

  if (!service) {
    throw createError('Service not found', 404)
  }

  res.json({
    success: true,
    data: service
  })
})

export const createService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name }: CreateServiceRequest = req.body

  if (!name || name.trim().length === 0) {
    throw createError('Service name is required', 400)
  }

  if (name.length > 100) {
    throw createError('Service name must be less than 100 characters', 400)
  }

  // التحقق من وجود الخدمة مسبقاً
  const existingServices = serviceOperations.getAll()
  const existingService = existingServices.find(s => s.name.toLowerCase() === name.trim().toLowerCase())

  if (existingService) {
    // إرجاع الخدمة الموجودة بدلاً من خطأ
    res.status(200).json({
      success: true,
      data: existingService,
      message: 'Service already exists'
    })
    return
  }

  try {
    const newService = serviceOperations.create({
      name: name.trim()
    })

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('service:created', newService)
      // Service created event broadcasted
    }

    res.status(201).json({
      success: true,
      data: newService
    })
  } catch (error: any) {
    // معالجة أخطاء قاعدة البيانات بلطف
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // البحث عن الخدمة الموجودة وإرجاعها
      const allServices = serviceOperations.getAll()
      const foundService = allServices.find(s => s.name.toLowerCase() === name.trim().toLowerCase())

      if (foundService) {
        res.status(200).json({
          success: true,
          data: foundService,
          message: 'Service already exists'
        })
        return
      }

      // إذا لم نجد الخدمة، أرجع خطأ عام
      res.status(500).json({
        success: false,
        message: 'Database constraint error'
      })
      return
    }
    throw error
  }
})

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id!)
  const { name }: CreateServiceRequest = req.body

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  if (!name || name.trim().length === 0) {
    throw createError('Service name is required', 400)
  }

  if (name.length > 100) {
    throw createError('Service name must be less than 100 characters', 400)
  }

  try {
    const updatedService = serviceOperations.update(serviceId, {
      name: name.trim()
    })

    if (!updatedService) {
      throw createError('Service not found', 404)
    }

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('service:updated', updatedService)
      // Service updated event broadcasted
    }

    res.json({
      success: true,
      data: updatedService
    })
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw createError('Service name already exists', 409)
    }
    throw error
  }
})

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.id!)

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  // Get service details before deletion for the event
  const serviceToDelete = serviceOperations.getById(serviceId)

  const deleted = serviceOperations.delete(serviceId)

  if (!deleted) {
    throw createError('Service not found', 404)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('service:deleted', {
      id: serviceId,
      name: serviceToDelete?.name || 'Unknown Service',
      timestamp: new Date().toISOString()
    })
    // Service deleted event broadcasted
  }

  res.json({
    success: true,
    message: 'Service deleted successfully'
  })
})
