"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDevicePrinter = exports.updateDevicePrinter = exports.createDevicePrinter = exports.getDevicePrintersByDevice = exports.getAllDevicePrinters = exports.deleteDevice = exports.updateDeviceStatus = exports.updateDevice = exports.createDevice = exports.getDevicesByType = exports.getOnlineDevices = exports.getDeviceByDeviceId = exports.getDeviceById = exports.getAllDevices = void 0;
const operations_1 = require("../db/operations");
const getAllDevices = async (req, res) => {
    try {
        const devices = operations_1.deviceOperations.getAll();
        res.json({
            success: true,
            data: devices,
            message: 'Devices retrieved successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve devices'
        });
    }
};
exports.getAllDevices = getAllDevices;
const getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
            return;
        }
        const deviceId = parseInt(id, 10);
        if (isNaN(deviceId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid device ID'
            });
            return;
        }
        const device = operations_1.deviceOperations.getById(deviceId);
        if (!device) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        res.json({
            success: true,
            data: device,
            message: 'Device retrieved successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve device'
        });
    }
};
exports.getDeviceById = getDeviceById;
const getDeviceByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;
        if (!deviceId) {
            res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
            return;
        }
        const device = operations_1.deviceOperations.getByDeviceId(deviceId);
        if (!device) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        res.json({
            success: true,
            data: device,
            message: 'Device retrieved successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve device'
        });
    }
};
exports.getDeviceByDeviceId = getDeviceByDeviceId;
const getOnlineDevices = async (req, res) => {
    try {
        const devices = operations_1.deviceOperations.getOnlineDevices();
        res.json({
            success: true,
            data: devices,
            message: 'Online devices retrieved successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve online devices'
        });
    }
};
exports.getOnlineDevices = getOnlineDevices;
const getDevicesByType = async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['display', 'customer', 'window'];
        if (!type || !validTypes.includes(type)) {
            res.status(400).json({
                success: false,
                message: 'Invalid device type. Must be one of: display, customer, window'
            });
            return;
        }
        const devices = operations_1.deviceOperations.getByType(type);
        res.json({
            success: true,
            data: devices,
            message: `${type} devices retrieved successfully`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve devices by type'
        });
    }
};
exports.getDevicesByType = getDevicesByType;
const createDevice = async (req, res) => {
    try {
        const deviceData = req.body;
        if (!deviceData.device_id || !deviceData.name || !deviceData.ip_address || !deviceData.device_type) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: device_id, name, ip_address, device_type'
            });
            return;
        }
        const existingDevice = operations_1.deviceOperations.getByDeviceId(deviceData.device_id);
        if (existingDevice) {
            const updatedDevice = operations_1.deviceOperations.updateStatus(deviceData.device_id, 'online');
            res.json({
                success: true,
                data: updatedDevice,
                message: 'Device updated successfully (already existed)'
            });
            return;
        }
        const deviceCreateData = {
            device_id: deviceData.device_id,
            name: deviceData.name,
            ip_address: deviceData.ip_address,
            device_type: deviceData.device_type,
            status: deviceData.status || 'offline',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        try {
            const device = operations_1.deviceOperations.create(deviceCreateData);
            res.status(201).json({
                success: true,
                data: device,
                message: 'Device created successfully'
            });
        }
        catch (createError) {
            const deviceCheck = operations_1.deviceOperations.getByDeviceId(deviceData.device_id);
            if (deviceCheck) {
                const updatedDevice = operations_1.deviceOperations.updateStatus(deviceData.device_id, deviceData.status || 'online');
                res.json({
                    success: true,
                    data: updatedDevice,
                    message: 'Device was created concurrently, status updated'
                });
            }
            else {
                throw createError;
            }
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create device'
        });
    }
};
exports.createDevice = createDevice;
const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
            return;
        }
        const deviceId = parseInt(id, 10);
        if (isNaN(deviceId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid device ID'
            });
            return;
        }
        const existingDevice = operations_1.deviceOperations.getById(deviceId);
        if (!existingDevice) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        const deviceUpdateData = {};
        if (updateData.name !== undefined)
            deviceUpdateData.name = updateData.name;
        if (updateData.ip_address !== undefined)
            deviceUpdateData.ip_address = updateData.ip_address;
        if (updateData.device_type !== undefined)
            deviceUpdateData.device_type = updateData.device_type;
        if (updateData.status !== undefined)
            deviceUpdateData.status = updateData.status;
        const updatedDevice = operations_1.deviceOperations.update(deviceId, deviceUpdateData);
        if (!updatedDevice) {
            res.status(500).json({
                success: false,
                message: 'Failed to update device'
            });
            return;
        }
        res.json({
            success: true,
            data: updatedDevice,
            message: 'Device updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update device'
        });
    }
};
exports.updateDevice = updateDevice;
const updateDeviceStatus = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { status } = req.body;
        if (!deviceId) {
            res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
            return;
        }
        const validStatuses = ['online', 'offline', 'error'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: online, offline, error'
            });
            return;
        }
        const updatedDevice = operations_1.deviceOperations.updateStatus(deviceId, status);
        if (!updatedDevice) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        res.json({
            success: true,
            data: updatedDevice,
            message: 'Device status updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update device status'
        });
    }
};
exports.updateDeviceStatus = updateDeviceStatus;
const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
            return;
        }
        const deviceId = parseInt(id, 10);
        if (isNaN(deviceId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid device ID'
            });
            return;
        }
        const deleted = operations_1.deviceOperations.delete(deviceId);
        if (!deleted) {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Device deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete device'
        });
    }
};
exports.deleteDevice = deleteDevice;
const getAllDevicePrinters = async (req, res) => {
    try {
        const printers = operations_1.devicePrinterOperations.getAll();
        res.json({
            success: true,
            data: printers,
            message: 'Device printers retrieved successfully'
        });
    }
    catch (error) {
        console.error('[DEVICE-CONTROLLER] Error getting all device printers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve device printers',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllDevicePrinters = getAllDevicePrinters;
const getDevicePrintersByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        if (!deviceId) {
            res.status(400).json({ success: false, message: 'Device ID is required' });
            return;
        }
        const printers = operations_1.devicePrinterOperations.getByDeviceId(deviceId);
        res.json({ success: true, data: printers, message: 'Device printers retrieved successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve device printers' });
    }
};
exports.getDevicePrintersByDevice = getDevicePrintersByDevice;
const createDevicePrinter = async (req, res) => {
    try {
        const { deviceId } = req.params;
        if (!deviceId) {
            res.status(400).json({ success: false, message: 'Device ID is required' });
            return;
        }
        const printerData = req.body;
        if (!printerData.printer_id || !printerData.printer_name) {
            res.status(400).json({ success: false, message: 'Missing required fields: printer_id, printer_name' });
            return;
        }
        const device = operations_1.deviceOperations.getByDeviceId(deviceId);
        if (!device) {
            res.status(404).json({ success: false, message: 'Device not found' });
            return;
        }
        const devicePrinters = operations_1.devicePrinterOperations.getByDeviceId(deviceId);
        const existingPrinter = devicePrinters.find(p => p.printer_id === printerData.printer_id ||
            p.printer_name === printerData.printer_name);
        if (existingPrinter) {
            res.status(409).json({
                success: false,
                message: `Printer already exists for this device: ${existingPrinter.printer_name}`
            });
            return;
        }
        const printerCreateData = {
            device_id: deviceId,
            printer_id: printerData.printer_id,
            printer_name: printerData.printer_name,
            is_default: printerData.is_default || false
        };
        const printer = operations_1.devicePrinterOperations.create(printerCreateData);
        res.status(201).json({ success: true, data: printer, message: 'Device printer created successfully' });
    }
    catch (error) {
        console.error('Device printer creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create device printer',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createDevicePrinter = createDevicePrinter;
const updateDevicePrinter = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: 'Printer ID is required' });
            return;
        }
        const printerId = parseInt(id, 10);
        const updateData = req.body;
        if (isNaN(printerId)) {
            res.status(400).json({ success: false, message: 'Invalid printer ID' });
            return;
        }
        const existingPrinter = operations_1.devicePrinterOperations.getById(printerId);
        if (!existingPrinter) {
            res.status(404).json({ success: false, message: 'Device printer not found' });
            return;
        }
        const printerUpdateData = {};
        if (updateData.printer_name !== undefined)
            printerUpdateData.printer_name = updateData.printer_name;
        const updatedPrinter = operations_1.devicePrinterOperations.update(printerId, printerUpdateData);
        if (!updatedPrinter) {
            res.status(500).json({ success: false, message: 'Failed to update device printer' });
            return;
        }
        res.json({ success: true, data: updatedPrinter, message: 'Device printer updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update device printer' });
    }
};
exports.updateDevicePrinter = updateDevicePrinter;
const deleteDevicePrinter = async (req, res) => {
    try {
        console.log('[SERVER] Delete printer request:', {
            params: req.params,
            body: req.body,
            method: req.method,
            url: req.url
        });
        const { id } = req.params;
        if (!id) {
            console.log('[SERVER] No printer ID provided');
            res.status(400).json({ success: false, message: 'Printer ID is required' });
            return;
        }
        const printerId = parseInt(id, 10);
        if (isNaN(printerId)) {
            console.log('[SERVER] Invalid printer ID:', id);
            res.status(400).json({ success: false, message: 'Invalid printer ID' });
            return;
        }
        console.log('[SERVER] Attempting to delete printer ID:', printerId);
        const deleted = operations_1.devicePrinterOperations.delete(printerId);
        console.log('[SERVER] Delete operation result:', deleted);
        if (!deleted) {
            console.log('[SERVER] Printer not found or not deleted:', printerId);
            res.status(404).json({ success: false, message: 'Device printer not found' });
            return;
        }
        console.log('[SERVER] Printer deleted successfully:', printerId);
        res.json({ success: true, message: 'Device printer deleted successfully' });
    }
    catch (error) {
        console.error('[SERVER] Delete printer error:', {
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            params: req.params
        });
        res.status(500).json({ success: false, message: 'Failed to delete device printer' });
    }
};
exports.deleteDevicePrinter = deleteDevicePrinter;
