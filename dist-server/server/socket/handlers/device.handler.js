"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeviceEvents = handleDeviceEvents;
exports.getConnectedDevices = getConnectedDevices;
exports.cleanupStaleDevices = cleanupStaleDevices;
const socket_config_1 = require("../socket.config");
const operations_1 = require("../../db/operations");
const socket_instance_1 = require("../socket.instance");
const connectedDevices = new Map();
function handleDeviceEvents(socket) {
    socket.on(socket_config_1.SOCKET_EVENTS.DEVICE_REGISTER, async (deviceInfo) => {
        try {
            const deviceId = deviceInfo.device_id || deviceInfo.deviceId;
            const deviceType = deviceInfo.device_type || deviceInfo.deviceType;
            const name = deviceInfo.name;
            const ip_address = deviceInfo.ip_address;
            if (!deviceId) {
                throw new Error('Device ID is required');
            }
            if (!ip_address) {
                throw new Error('Device IP address is required - no fallback allowed');
            }
            connectedDevices.set(deviceId, {
                socketId: socket.id,
                deviceType: deviceType || socket_config_1.DEVICE_TYPES.DISPLAY,
                lastSeen: Date.now(),
                deviceInfo
            });
            let device;
            try {
                device = operations_1.deviceOperations.create({
                    device_id: deviceId,
                    name: name || `${deviceType} Device`,
                    ip_address: ip_address,
                    device_type: deviceType,
                    status: 'online'
                });
            }
            catch (createError) {
                device = operations_1.deviceOperations.updateStatus(deviceId, 'online');
            }
            socket.join(`device:${deviceId}`);
            socket.join(`type:${deviceType}`);
            switch (deviceType) {
                case socket_config_1.DEVICE_TYPES.DISPLAY:
                    socket.join(socket_config_1.SOCKET_ROOMS.DISPLAYS);
                    break;
                case socket_config_1.DEVICE_TYPES.WINDOW:
                    socket.join(socket_config_1.SOCKET_ROOMS.WINDOWS);
                    break;
                case socket_config_1.DEVICE_TYPES.CUSTOMER:
                    socket.join(socket_config_1.SOCKET_ROOMS.CUSTOMERS);
                    break;
                case socket_config_1.DEVICE_TYPES.PRINTER:
                    socket.join(socket_config_1.SOCKET_ROOMS.PRINTERS);
                    break;
                case socket_config_1.DEVICE_TYPES.ADMIN:
                    socket.join('admins');
                    break;
            }
            try {
                const deviceWindow = operations_1.windowOperations.getByDeviceId(deviceId);
                if (deviceWindow) {
                    operations_1.windowOperations.activateForDevice(deviceId);
                    console.log(`[DEVICE-HANDLER] 🪟 Activated window ${deviceWindow.id} for device ${deviceId}`);
                    (0, socket_instance_1.emitToAll)('window:status-updated', {
                        windowId: deviceWindow.id,
                        deviceId: deviceId,
                        active: true,
                        timestamp: new Date().toISOString()
                    });
                }
                else if (deviceType === socket_config_1.DEVICE_TYPES.WINDOW || deviceType === 'window' || deviceType === 'employee') {
                    const newWindow = operations_1.windowOperations.create({
                        device_id: deviceId,
                        active: true
                    });
                    console.log(`[DEVICE-HANDLER] 🪟 Created and activated window ${newWindow.id} for device ${deviceId}`);
                    (0, socket_instance_1.emitToAll)('window:created', {
                        window: {
                            ...newWindow,
                            label: `شباك ${newWindow.id}`
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (windowError) {
                console.error(`[DEVICE-HANDLER] ❌ Failed to sync window status for device ${deviceId}:`, windowError);
            }
            const rooms = Array.from(socket.rooms);
            socket.emit(socket_config_1.SOCKET_EVENTS.DEVICE_REGISTERED, {
                success: true,
                device: device || { device_id: deviceId, device_type: deviceType, status: 'online' },
                timestamp: new Date().toISOString()
            });
            socket.broadcast.emit(socket_config_1.SOCKET_EVENTS.DEVICE_CONNECTED, {
                deviceId: deviceId,
                deviceType: deviceType,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit(socket_config_1.SOCKET_EVENTS.DEVICE_REGISTERED, {
                success: false,
                error: error instanceof Error ? error.message : 'Registration failed',
                timestamp: new Date().toISOString()
            });
        }
    });
    socket.on(socket_config_1.SOCKET_EVENTS.DEVICE_HEARTBEAT, (data) => {
        if (data.deviceId) {
            const deviceInfo = connectedDevices.get(data.deviceId);
            if (deviceInfo) {
                deviceInfo.lastSeen = Date.now();
                connectedDevices.set(data.deviceId, deviceInfo);
                operations_1.deviceOperations.updateLastSeen(data.deviceId);
                socket.broadcast.emit(socket_config_1.SOCKET_EVENTS.DEVICE_STATUS, {
                    deviceId: data.deviceId,
                    status: 'online',
                    lastSeen: new Date().toISOString(),
                    ...data
                });
            }
        }
    });
    socket.on(socket_config_1.SOCKET_EVENTS.DISCONNECT, (reason) => {
        for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
            if (deviceInfo.socketId === socket.id) {
                connectedDevices.delete(deviceId);
                operations_1.deviceOperations.updateStatus(deviceId, 'offline');
                try {
                    const deviceWindow = operations_1.windowOperations.getByDeviceId(deviceId);
                    if (deviceWindow) {
                        operations_1.windowOperations.deactivateForDevice(deviceId);
                        console.log(`[DEVICE-HANDLER] 🪟 Deactivated window ${deviceWindow.id} for device ${deviceId}`);
                        (0, socket_instance_1.emitToAll)('window:status-updated', {
                            windowId: deviceWindow.id,
                            deviceId: deviceId,
                            active: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                catch (windowError) {
                    console.error(`[DEVICE-HANDLER] ❌ Failed to sync window status for device ${deviceId}:`, windowError);
                }
                (0, socket_instance_1.emitToAll)(socket_config_1.SOCKET_EVENTS.DEVICE_DISCONNECTED, {
                    deviceId,
                    status: 'offline',
                    reason: reason || 'connection_lost',
                    timestamp: new Date().toISOString()
                });
                break;
            }
        }
    });
}
function getConnectedDevices() {
    return Array.from(connectedDevices.entries()).map(([deviceId, info]) => ({
        deviceId,
        ...info,
        isOnline: Date.now() - info.lastSeen < 60000
    }));
}
function cleanupStaleDevices() {
    const staleThreshold = 2 * 60 * 1000;
    const now = Date.now();
    for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
        if (now - deviceInfo.lastSeen > staleThreshold) {
            connectedDevices.delete(deviceId);
            operations_1.deviceOperations.updateStatus(deviceId, 'offline');
            try {
                const deviceWindow = operations_1.windowOperations.getByDeviceId(deviceId);
                if (deviceWindow) {
                    operations_1.windowOperations.deactivateForDevice(deviceId);
                    console.log(`[CLEANUP] 🪟 Deactivated window ${deviceWindow.id} for stale device ${deviceId}`);
                    (0, socket_instance_1.emitToAll)('window:status-updated', {
                        windowId: deviceWindow.id,
                        deviceId: deviceId,
                        active: false,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            catch (windowError) {
                console.error(`[CLEANUP] ❌ Failed to sync window status for device ${deviceId}:`, windowError);
            }
            (0, socket_instance_1.emitToAll)(socket_config_1.SOCKET_EVENTS.DEVICE_STATUS, {
                deviceId,
                status: 'offline',
                reason: 'stale_connection',
                timestamp: new Date().toISOString()
            });
        }
    }
}
