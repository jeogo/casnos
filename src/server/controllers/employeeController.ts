import { Request, Response } from 'express'
import { employeeOperations, serviceOperations } from '../db/database'
import { DatabaseEmployee } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { getSocketIO } from '../utils/socketInstance'

// Get all employees
export const getAllEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = employeeOperations.getAll()

  res.json({
    success: true,
    count: employees.length,
    data: employees
  })
})

// Get active employees
export const getActiveEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = employeeOperations.getActiveEmployees()

  res.json({
    success: true,
    count: employees.length,
    data: employees
  })
})

// Get employee by window number
export const getEmployeeByWindowNumber = asyncHandler(async (req: Request, res: Response) => {
  const windowNumber = req.params.windowNumber

  if (!windowNumber) {
    throw createError('Window number is required', 400)
  }

  const employee = employeeOperations.getByWindowNumber(windowNumber)

  if (!employee) {
    throw createError('Employee not found', 404)
  }

  res.json({
    success: true,
    data: employee
  })
})

// Check if window number is available
export const checkWindowNumberAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { windowNumber } = req.params

  if (!windowNumber) {
    throw createError('Window number is required', 400)
  }

  const existingEmployee = employeeOperations.getByWindowNumber(windowNumber)
  const isAvailable = !existingEmployee

  res.json({
    success: true,
    data: {
      windowNumber,
      isAvailable,
      message: isAvailable ?
        `Window number ${windowNumber} is available` :
        `Window number ${windowNumber} is already assigned`
    }
  })
})

// Get next available window number
export const getNextWindowNumber = asyncHandler(async (req: Request, res: Response) => {
  const nextWindowNumber = employeeOperations.getNextWindowNumber()

  res.json({
    success: true,
    data: {
      windowNumber: nextWindowNumber
    }
  })
})

// Create or register new employee window
export const createEmployeeWindow = asyncHandler(async (req: Request, res: Response) => {
  const { windowNumber, serviceId, serviceName, deviceId } = req.body

  // If no window number provided, generate next available
  const finalWindowNumber = windowNumber || employeeOperations.getNextWindowNumber()

  // Check if window number already exists
  const existingEmployee = employeeOperations.getByWindowNumber(finalWindowNumber)
  if (existingEmployee) {
    // Return error for explicit duplicate assignment
    throw createError(`Window number ${finalWindowNumber} is already assigned to an employee`, 409)
  }

  // Validate service if provided
  if (serviceId) {
    const service = serviceOperations.getById(serviceId)
    if (!service) {
      throw createError('Service not found', 404)
    }
  }

  try {
    const newEmployee = employeeOperations.create({
      window_number: finalWindowNumber,
      device_id: deviceId || `legacy-${finalWindowNumber}-${Date.now()}`,
      service_id: serviceId || null,
      service_name: serviceName || null,
      is_active: true
    })

    // 🔥 Emit real-time event to all connected clients
    const io = getSocketIO()
    if (io) {
      io.emit('employee:created', newEmployee)
      // Employee window created event broadcasted
    }

    res.status(201).json({
      success: true,
      data: newEmployee,
      message: 'Employee window created successfully'
    })
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Handle database constraint error
      throw createError(`Window number ${finalWindowNumber} is already assigned`, 409)
    }
    throw error
  }
})

// Assign service to employee
export const assignServiceToEmployee = asyncHandler(async (req: Request, res: Response) => {
  const windowNumber = req.params.windowNumber
  const { serviceId } = req.body

  if (!windowNumber) {
    throw createError('Window number is required', 400)
  }

  if (!serviceId) {
    throw createError('Service ID is required', 400)
  }

  // Validate service exists
  const service = serviceOperations.getById(serviceId)
  if (!service) {
    throw createError('Service not found', 404)
  }

  // Check if employee exists, create if not
  let employee = employeeOperations.getByWindowNumber(windowNumber)
  if (!employee) {
    employee = employeeOperations.create({
      window_number: windowNumber,
      device_id: `assign-${windowNumber}-${Date.now()}`,
      service_id: serviceId,
      service_name: service.name,
      is_active: true
    })
  } else {
    // Update existing employee
    employee = employeeOperations.assignService(windowNumber, serviceId, service.name)
  }

  if (!employee) {
    throw createError('Failed to assign service to employee', 500)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('employee:service-assigned', {
      windowNumber: employee.window_number,
      serviceId: employee.service_id,
      serviceName: employee.service_name,
      timestamp: new Date().toISOString()
    })
    // Service assignment event broadcasted
  }

  res.json({
    success: true,
    data: employee,
    message: 'Service assigned successfully'
  })
})

// Remove service from employee
export const removeServiceFromEmployee = asyncHandler(async (req: Request, res: Response) => {
  const windowNumber = req.params.windowNumber

  if (!windowNumber) {
    throw createError('Window number is required', 400)
  }

  const employee = employeeOperations.removeService(windowNumber)

  if (!employee) {
    throw createError('Employee not found', 404)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('employee:service-removed', {
      windowNumber: employee.window_number,
      timestamp: new Date().toISOString()
    })
    // Service removal event broadcasted
  }

  res.json({
    success: true,
    data: employee,
    message: 'Service removed successfully'
  })
})

// Update employee
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = parseInt(req.params.id!)
  const updateData: Partial<DatabaseEmployee> = req.body

  if (isNaN(employeeId)) {
    throw createError('Invalid employee ID', 400)
  }

  // If window_number is being updated, check for duplicates
  if (updateData.window_number) {
    const existingEmployee = employeeOperations.getByWindowNumber(updateData.window_number)
    if (existingEmployee && existingEmployee.id !== employeeId) {
      throw createError(`Window number ${updateData.window_number} is already assigned to another employee`, 409)
    }
  }

  // Validate service if provided
  if (updateData.service_id) {
    const service = serviceOperations.getById(updateData.service_id)
    if (!service) {
      throw createError('Service not found', 404)
    }
    updateData.service_name = service.name
  }

  const updatedEmployee = employeeOperations.update(employeeId, updateData)

  if (!updatedEmployee) {
    throw createError('Employee not found', 404)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('employee:updated', updatedEmployee)
    // Employee updated event broadcasted
  }

  res.json({
    success: true,
    data: updatedEmployee,
    message: 'Employee updated successfully'
  })
})

// Delete employee
export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = parseInt(req.params.id!)

  if (isNaN(employeeId)) {
    throw createError('Invalid employee ID', 400)
  }

  // Get employee details before deletion for the event
  const employeeToDelete = employeeOperations.getById(employeeId)

  const deleted = employeeOperations.delete(employeeId)

  if (!deleted) {
    throw createError('Employee not found', 404)
  }

  // 🔥 Emit real-time event to all connected clients
  const io = getSocketIO()
  if (io) {
    io.emit('employee:deleted', {
      id: employeeId,
      windowNumber: employeeToDelete?.window_number || 'Unknown',
      timestamp: new Date().toISOString()
    })
    // Employee deleted event broadcasted
  }

  res.json({
    success: true,
    message: 'Employee deleted successfully'
  })
})

// Initialize employee session (for when employee screen starts)
export const initializeEmployeeSession = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, deviceName } = req.body

  if (!deviceId) {
    throw createError('Device ID is required', 400)
  }

  // Initializing session for device

  // First, check if there's already an employee for this device ID
  let employee = employeeOperations.getByDeviceId(deviceId)

  if (employee) {
    // Employee already exists for this device, return it
    // Found existing employee for device

    res.json({
      success: true,
      data: {
        employee,
        windowNumber: employee.window_number,
        hasService: !!employee.service_id,
        requiresServiceSelection: !employee.service_id
      },
      message: 'Employee session restored successfully'
    })
    return
  }

  // No existing employee for this device, create a new one
  const nextWindowNumber = employeeOperations.getNextWindowNumber()

  try {
    employee = employeeOperations.create({
      window_number: nextWindowNumber,
      device_id: deviceId,
      service_id: null,
      service_name: null,
      is_active: true
    })

    // Created new employee session

    // 🔥 Emit real-time event
    const io = getSocketIO()
    if (io) {
      io.emit('employee:session-initialized', {
        windowNumber: employee.window_number,
        deviceId,
        deviceName,
        timestamp: new Date().toISOString()
      })
      // Employee session initialized
    }

    res.json({
      success: true,
      data: {
        employee,
        windowNumber: employee.window_number,
        hasService: !!employee.service_id,
        requiresServiceSelection: !employee.service_id
      },
      message: 'Employee session initialized successfully'
    })

  } catch (error: any) {

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // If there's a constraint error, try to find the existing employee and return it
      const existingEmployee = employeeOperations.getByDeviceId(deviceId)
      if (existingEmployee) {
        res.json({
          success: true,
          data: {
            employee: existingEmployee,
            windowNumber: existingEmployee.window_number,
            hasService: !!existingEmployee.service_id,
            requiresServiceSelection: !existingEmployee.service_id
          },
          message: 'Employee session restored successfully'
        })
        return
      }
    }

    throw createError('Failed to initialize employee session', 500)
  }
})
