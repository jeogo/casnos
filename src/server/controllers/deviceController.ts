import { Request, Response } from 'express'
import { deviceOperations, devicePrinterOperations } from '../db/database'
// logger removed
import {
  CreateDeviceRequest,
  UpdateDeviceRequest,
  CreateDevicePrinterRequest,
  UpdateDevicePrinterRequest,
  Device,
  DevicePrinter,
  DatabaseDevice,
  DatabaseDevicePrinter
} from '../types'

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
    const validTypes = ['display', 'customer', 'employee']

    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Invalid device type. Must be one of: display, customer, employee'
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

    // Prepare device data, omitting undefined optional fields
    const deviceCreateData: DatabaseDevice = {
      device_id: deviceData.device_id,
      name: deviceData.name,
      ip_address: deviceData.ip_address,
      port: deviceData.port || 3001,
      device_type: deviceData.device_type,
      status: 'offline' // Default status
    }

    if (deviceData.capabilities) {
      deviceCreateData.capabilities = JSON.stringify(deviceData.capabilities)
    }

    if (deviceData.metadata) {
      deviceCreateData.metadata = JSON.stringify(deviceData.metadata)
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
    if (updateData.port !== undefined) deviceUpdateData.port = updateData.port
    if (updateData.device_type !== undefined) deviceUpdateData.device_type = updateData.device_type
    if (updateData.status !== undefined) deviceUpdateData.status = updateData.status
    if (updateData.capabilities !== undefined) deviceUpdateData.capabilities = JSON.stringify(updateData.capabilities)
    if (updateData.metadata !== undefined) deviceUpdateData.metadata = JSON.stringify(updateData.metadata)

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

export const heartbeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      })
      return
    }

    const updatedDevice = deviceOperations.updateLastSeen(deviceId)
    if (!updatedDevice) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      })
      return
    }

    res.json({
      success: true,
      data: { last_seen: updatedDevice.last_seen },
      message: 'Heartbeat received'
    })
  } catch (error) {
    // logger removed
    res.status(500).json({
      success: false,
      message: 'Failed to process heartbeat'
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
    const deviceIdNum = parseInt(deviceId, 10)
    if (isNaN(deviceIdNum)) {
      res.status(400).json({ success: false, message: 'Invalid device ID' })
      return
    }
    const printers = devicePrinterOperations.getByDeviceId(deviceIdNum)
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
    const deviceIdNum = parseInt(deviceId, 10)
    const printerData = req.body
    if (isNaN(deviceIdNum)) {
      res.status(400).json({ success: false, message: 'Invalid device ID' })
      return
    }
    // Validate required fields
    if (!printerData.printer_id || !printerData.printer_name) {
      res.status(400).json({ success: false, message: 'Missing required fields: printer_id, printer_name' })
      return
    }
    // Check if device exists
    const device = deviceOperations.getById(deviceIdNum)
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
    // Prepare printer data (only allowed fields)
    const printerCreateData = {
      device_id: deviceIdNum,
      printer_id: printerData.printer_id,
      printer_name: printerData.printer_name
    }
    const printer = devicePrinterOperations.create(printerCreateData)
    res.status(201).json({ success: true, data: printer, message: 'Device printer created successfully' })
  } catch (error) {
    // logger removed
    res.status(500).json({ success: false, message: 'Failed to create device printer' })
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
