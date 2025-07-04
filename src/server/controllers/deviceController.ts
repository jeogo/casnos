import { Request, Response } from 'express'
import { deviceOperations, devicePrinterOperations } from '../db/operations'
// logger removed
import {
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DatabaseDevice,
  DatabaseDevicePrinter
} from '../types/device'

// Device Management Controllers

export const getAllDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = deviceOperations.getAll()
    res.json({
      success: true,
      data: devices,
      message: 'Devices retrieved successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices'
    })
  }
}

export const getDeviceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const deviceId = parseInt(id, 10)

    if (isNaN(deviceId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid device ID'
      })
      return
    }

    const device = deviceOperations.getById(deviceId)
    if (!device) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    res.json({
      success: true,
      data: device,
      message: 'Device retrieved successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve device'
    })
  }
}

export const getDeviceByDeviceId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const device = deviceOperations.getByDeviceId(deviceId)
    if (!device) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    res.json({
      success: true,
      data: device,
      message: 'Device retrieved successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve device'
    })
  }
}

export const getOnlineDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = deviceOperations.getOnlineDevices()
    res.json({
      success: true,
      data: devices,
      message: 'Online devices retrieved successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve online devices'
    })
  }
}

export const getDevicesByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params
    const validTypes = ['display', 'customer', 'window']

    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Invalid device type. Must be one of: display, customer, window'
      })
      return
    }

    const devices = deviceOperations.getByType(type)
    res.json({
      success: true,
      data: devices,
      message: `${type} devices retrieved successfully`
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices by type'
    })
  }
}

export const createDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceData: CreateDeviceRequest = req.body

    // Validate required fields
    if (!deviceData.device_id || !deviceData.name || !deviceData.ip_address || !deviceData.device_type) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: device_id, name, ip_address, device_type'
      })
      return
    }

    // Check if device already exists - if so, update it instead of creating
    const existingDevice = deviceOperations.getByDeviceId(deviceData.device_id)
    if (existingDevice) {


      // Update device status to online and last_seen
      const updatedDevice = deviceOperations.updateStatus(deviceData.device_id, 'online')

      res.json({
        success: true,
        data: updatedDevice,
        message: 'Device updated successfully (already existed)'
      })
      return
    }

    // Prepare device data
    const deviceCreateData: DatabaseDevice = {
      device_id: deviceData.device_id,
      name: deviceData.name,
      ip_address: deviceData.ip_address,
      device_type: deviceData.device_type,
      status: 'offline', // Default status
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const device = deviceOperations.create(deviceCreateData)

    res.status(201).json({
      success: true,
      data: device,
      message: 'Device created successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to create device'
    })
  }
}

export const updateDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const updateData: UpdateDeviceRequest = req.body

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const deviceId = parseInt(id, 10)

    if (isNaN(deviceId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid device ID'
      })
      return
    }

    const existingDevice = deviceOperations.getById(deviceId)
    if (!existingDevice) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    // Prepare update data, only including fields that should be updated
    const deviceUpdateData: Partial<DatabaseDevice> = {}

    if (updateData.name !== undefined) deviceUpdateData.name = updateData.name
    if (updateData.ip_address !== undefined) deviceUpdateData.ip_address = updateData.ip_address
    if (updateData.device_type !== undefined) deviceUpdateData.device_type = updateData.device_type
    if (updateData.status !== undefined) deviceUpdateData.status = updateData.status

    const updatedDevice = deviceOperations.update(deviceId, deviceUpdateData)

    if (!updatedDevice) {
      res.status(500).json({
        success: false,
        message: 'Failed to update device'
      })
      return
    }

    res.json({
      success: true,
      data: updatedDevice,
      message: 'Device updated successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to update device'
    })
  }
}

export const updateDeviceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params
    const { status } = req.body

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const validStatuses = ['online', 'offline', 'error']
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: online, offline, error'
      })
      return
    }

    const updatedDevice = deviceOperations.updateStatus(deviceId, status)
    if (!updatedDevice) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    res.json({
      success: true,
      data: updatedDevice,
      message: 'Device status updated successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to update device status'
    })
  }
}

export const deleteDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const deviceId = parseInt(id, 10)

    if (isNaN(deviceId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid device ID'
      })
      return
    }

    const deleted = deviceOperations.delete(deviceId)
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    res.json({
      success: true,
      message: 'Device deleted successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to delete device'
    })
  }
}

// Device Printer Controllers

export const getAllDevicePrinters = async (req: Request, res: Response): Promise<void> => {
  try {
    const printers = devicePrinterOperations.getAll()
    res.json({
      success: true,
      data: printers,
      message: 'Device printers retrieved successfully'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve device printers'
    })
  }
}

export const getDevicePrintersByDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params
    if (!deviceId) {
      res.status(400).json({ success: false, message: 'Device ID is required' })
      return
    }

    const printers = devicePrinterOperations.getByDeviceId(deviceId)
    res.json({ success: true, data: printers, message: 'Device printers retrieved successfully' })
  } catch (error) {
    // logger removed
    res.status(500).json({ success: false, message: 'Failed to retrieve device printers' })
  }
}

export const createDevicePrinter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params
    if (!deviceId) {
      res.status(400).json({ success: false, message: 'Device ID is required' })
      return
    }

    const printerData = req.body

    // Validate required fields
    if (!printerData.printer_id || !printerData.printer_name) {
      res.status(400).json({ success: false, message: 'Missing required fields: printer_id, printer_name' })
      return
    }

    // Check if device exists by device_id (string)
    const device = deviceOperations.getByDeviceId(deviceId)
    if (!device) {
      res.status(404).json({ success: false, message: 'Device not found' })
      return
    }

    // Check if printer already exists for this device
    const existingPrinter = devicePrinterOperations.getByPrinterId(printerData.printer_id)
    if (existingPrinter) {
      res.status(409).json({ success: false, message: 'Printer with this printer_id already exists' })
      return
    }

    // Prepare printer data (only allowed fields that exist in schema)
    const printerCreateData: DatabaseDevicePrinter = {
      device_id: deviceId, // Use string device_id
      printer_id: printerData.printer_id,
      printer_name: printerData.printer_name,
      is_default: printerData.is_default || false
    }

    const printer = devicePrinterOperations.create(printerCreateData)
    res.status(201).json({ success: true, data: printer, message: 'Device printer created successfully' })
  } catch (error) {
    console.error('Device printer creation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create device printer',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const updateDevicePrinter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({ success: false, message: 'Printer ID is required' })
      return
    }
    const printerId = parseInt(id, 10)
    const updateData = req.body
    if (isNaN(printerId)) {
      res.status(400).json({ success: false, message: 'Invalid printer ID' })
      return
    }
    const existingPrinter = devicePrinterOperations.getById(printerId)
    if (!existingPrinter) {
      res.status(404).json({ success: false, message: 'Device printer not found' })
      return
    }
    // Only allow updating printer_name
    const printerUpdateData: { printer_name?: string } = {}
    if (updateData.printer_name !== undefined) printerUpdateData.printer_name = updateData.printer_name
    const updatedPrinter = devicePrinterOperations.update(printerId, printerUpdateData)
    if (!updatedPrinter) {
      res.status(500).json({ success: false, message: 'Failed to update device printer' })
      return
    }
    res.json({ success: true, data: updatedPrinter, message: 'Device printer updated successfully' })
  } catch (error) {
    // logger removed
    res.status(500).json({ success: false, message: 'Failed to update device printer' })
  }
}

export const deleteDevicePrinter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({ success: false, message: 'Printer ID is required' })
      return
    }
    const printerId = parseInt(id, 10)
    if (isNaN(printerId)) {
      res.status(400).json({ success: false, message: 'Invalid printer ID' })
      return
    }
    const deleted = devicePrinterOperations.delete(printerId)
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Device printer not found' })
      return
    }
    res.json({ success: true, message: 'Device printer deleted successfully' })
  } catch (error) {
    // logger removed
    res.status(500).json({ success: false, message: 'Failed to delete device printer' })
  }
}
