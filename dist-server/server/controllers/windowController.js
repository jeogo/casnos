"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeServiceFromWindow = exports.deactivateDeviceWindow = exports.activateDeviceWindow = exports.getWindowByDeviceId = exports.registerDeviceWindow = exports.assignServiceToWindow = exports.getActiveWindowsByService = exports.getWindowsByService = exports.getActiveWindows = exports.createWindowWithAutoNumber = exports.deleteWindow = exports.updateWindow = exports.createWindow = exports.getWindowById = exports.getAllWindows = void 0;
const windows_1 = require("../db/operations/windows");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const device_handler_1 = require("../socket/handlers/device.handler");
exports.getAllWindows = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windows = windows_1.windowOperations.getAll();
    console.log('[WINDOW-CONTROLLER] 📊 Raw windows from DB:', JSON.stringify(windows, null, 2));
    const connectedDevices = (0, device_handler_1.getConnectedDevices)();
    const connectedDeviceIds = new Set(connectedDevices.map(d => d.deviceId));
    const processedWindows = windows.map(w => {
        const isDeviceConnected = w.device_id ? connectedDeviceIds.has(w.device_id) : false;
        return {
            ...w,
            active: Boolean(w.active) && isDeviceConnected,
            device_connected: isDeviceConnected,
            label: `شباك ${w.id}`
        };
    });
    console.log('[WINDOW-CONTROLLER] 📊 Processed windows with device status:', JSON.stringify(processedWindows, null, 2));
    res.json({
        success: true,
        count: windows.length,
        data: processedWindows
    });
});
exports.getWindowById = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windowId = parseInt(req.params.id);
    if (isNaN(windowId)) {
        throw (0, errorMiddleware_1.createError)('Invalid window ID', 400);
    }
    const window = windows_1.windowOperations.getById(windowId);
    if (!window) {
        throw (0, errorMiddleware_1.createError)('Window not found', 404);
    }
    res.json({
        success: true,
        data: {
            ...window,
            label: `شباك ${window.id}`
        }
    });
});
exports.createWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { service_id, device_id, active } = req.body;
    try {
        const windowData = {
            active: active !== false
        };
        if (service_id !== undefined) {
            windowData.service_id = service_id;
        }
        if (device_id !== undefined) {
            windowData.device_id = device_id;
        }
        const newWindow = windows_1.windowOperations.create(windowData);
        res.status(201).json({
            success: true,
            data: {
                ...newWindow,
                label: `شباك ${newWindow.id}`
            }
        });
    }
    catch (error) {
        throw error;
    }
});
exports.updateWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windowId = parseInt(req.params.id);
    const { service_id, device_id, active } = req.body;
    console.log('[WINDOW-CONTROLLER] 🔄 Updating window:', windowId, 'with data:', { service_id, device_id, active });
    if (isNaN(windowId)) {
        throw (0, errorMiddleware_1.createError)('Invalid window ID', 400);
    }
    try {
        const updateData = {};
        if (service_id !== undefined) {
            updateData.service_id = service_id;
            console.log('[WINDOW-CONTROLLER] 📝 Setting service_id:', service_id);
        }
        if (device_id !== undefined) {
            updateData.device_id = device_id;
            console.log('[WINDOW-CONTROLLER] 📝 Setting device_id:', device_id);
        }
        if (active !== undefined) {
            updateData.active = Boolean(active);
            console.log('[WINDOW-CONTROLLER] 📝 Setting active from', active, 'to', updateData.active);
        }
        console.log('[WINDOW-CONTROLLER] 📊 Final update data:', updateData);
        const updatedWindow = windows_1.windowOperations.update(windowId, updateData);
        if (!updatedWindow) {
            throw (0, errorMiddleware_1.createError)('Window not found', 404);
        }
        console.log('[WINDOW-CONTROLLER] ✅ Window updated successfully:', updatedWindow);
        res.json({
            success: true,
            data: {
                ...updatedWindow,
                active: Boolean(updatedWindow.active),
                label: `شباك ${updatedWindow.id}`
            }
        });
    }
    catch (error) {
        console.error('[WINDOW-CONTROLLER] ❌ Update error:', error);
        throw error;
    }
});
exports.deleteWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windowId = parseInt(req.params.id);
    if (isNaN(windowId)) {
        throw (0, errorMiddleware_1.createError)('Invalid window ID', 400);
    }
    const deleted = windows_1.windowOperations.delete(windowId);
    if (!deleted) {
        throw (0, errorMiddleware_1.createError)('Window not found', 404);
    }
    res.json({
        success: true,
        message: 'Window deleted successfully'
    });
});
exports.createWindowWithAutoNumber = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    try {
        const newWindow = windows_1.windowOperations.create({
            active: true
        });
        res.status(201).json({
            success: true,
            data: {
                ...newWindow,
                label: `شباك ${newWindow.id}`
            },
            message: 'Window registered successfully'
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to create window', 500);
    }
});
exports.getActiveWindows = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windows = windows_1.windowOperations.getActiveWindows();
    res.json({
        success: true,
        count: windows.length,
        data: windows.map(w => ({
            ...w,
            label: `شباك ${w.id}`
        }))
    });
});
exports.getWindowsByService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    const windows = windows_1.windowOperations.getByServiceId(serviceId);
    res.json({
        success: true,
        count: windows.length,
        data: windows.map(w => ({
            ...w,
            label: `شباك ${w.id}`
        }))
    });
});
exports.getActiveWindowsByService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    const windows = windows_1.windowOperations.getActiveByServiceId(serviceId);
    res.json({
        success: true,
        count: windows.length,
        data: windows.map(w => ({
            ...w,
            label: `شباك ${w.id}`
        }))
    });
});
exports.assignServiceToWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windowId = parseInt(req.params.id);
    const { service_id } = req.body;
    if (isNaN(windowId)) {
        throw (0, errorMiddleware_1.createError)('Invalid window ID', 400);
    }
    if (!service_id || isNaN(parseInt(service_id))) {
        throw (0, errorMiddleware_1.createError)('Valid service ID is required', 400);
    }
    const updatedWindow = windows_1.windowOperations.assignService(windowId, parseInt(service_id));
    if (!updatedWindow) {
        throw (0, errorMiddleware_1.createError)('Window not found', 404);
    }
    res.json({
        success: true,
        data: {
            ...updatedWindow,
            label: `شباك ${updatedWindow.id}`
        },
        message: 'Service assigned to window successfully'
    });
});
exports.registerDeviceWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { device_id, service_id } = req.body;
    if (!device_id) {
        throw (0, errorMiddleware_1.createError)('Device ID is required', 400);
    }
    try {
        const window = windows_1.windowOperations.createOrUpdateForDevice(device_id, {
            service_id: service_id || null
        });
        res.json({
            success: true,
            data: {
                ...window,
                label: `شباك ${window.id}`
            },
            message: 'Window registered for device successfully'
        });
    }
    catch (error) {
        console.error('Error registering device window:', error);
        throw (0, errorMiddleware_1.createError)('Failed to register window for device', 500);
    }
});
exports.getWindowByDeviceId = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
        throw (0, errorMiddleware_1.createError)('Device ID is required', 400);
    }
    const window = windows_1.windowOperations.getByDeviceId(deviceId);
    if (!window) {
        throw (0, errorMiddleware_1.createError)('Window not found for this device', 404);
    }
    res.json({
        success: true,
        data: {
            ...window,
            label: `شباك ${window.id}`
        }
    });
});
exports.activateDeviceWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
        throw (0, errorMiddleware_1.createError)('Device ID is required', 400);
    }
    const window = windows_1.windowOperations.activateForDevice(deviceId);
    if (!window) {
        throw (0, errorMiddleware_1.createError)('Window not found for this device', 404);
    }
    res.json({
        success: true,
        data: {
            ...window,
            label: `شباك ${window.id}`
        },
        message: 'Window activated successfully'
    });
});
exports.deactivateDeviceWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
        throw (0, errorMiddleware_1.createError)('Device ID is required', 400);
    }
    const window = windows_1.windowOperations.deactivateForDevice(deviceId);
    if (!window) {
        throw (0, errorMiddleware_1.createError)('Window not found for this device', 404);
    }
    res.json({
        success: true,
        data: {
            ...window,
            label: `شباك ${window.id}`
        },
        message: 'Window deactivated successfully'
    });
});
exports.removeServiceFromWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const windowId = parseInt(req.params.id);
    if (isNaN(windowId)) {
        throw (0, errorMiddleware_1.createError)('Invalid window ID', 400);
    }
    const updatedWindow = windows_1.windowOperations.removeService(windowId);
    if (!updatedWindow) {
        throw (0, errorMiddleware_1.createError)('Window not found', 404);
    }
    res.json({
        success: true,
        data: {
            ...updatedWindow,
            label: `شباك ${updatedWindow.id}`
        },
        message: 'Service removed from window successfully'
    });
});
