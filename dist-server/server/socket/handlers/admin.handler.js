"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminEvents = handleAdminEvents;
const socket_config_1 = require("../socket.config");
const device_handler_1 = require("./device.handler");
const socket_instance_1 = require("../socket.instance");
const operations_1 = require("../../db/operations");
function handleAdminEvents(socket) {
    socket.on('admin:get-system-status', () => {
        if (!isAdminSocket(socket)) {
            socket.emit('admin:unauthorized', {
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const systemStatus = {
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            },
            socket: (0, socket_instance_1.getConnectionStats)(),
            devices: (0, device_handler_1.getConnectedDevices)(),
            queue: {
                pending: operations_1.ticketOperations.getPendingTickets().length,
                total: operations_1.ticketOperations.getAll().length,
                served: operations_1.ticketOperations.getAll().filter(t => t.status === 'served').length
            }
        };
        socket.emit('admin:system-status', systemStatus);
    });
    socket.on('admin:get-statistics', () => {
        if (!isAdminSocket(socket)) {
            socket.emit('admin:unauthorized', {
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const allTickets = operations_1.ticketOperations.getAll();
        const today = new Date().toDateString();
        const todayTickets = allTickets.filter(ticket => new Date(ticket.created_at).toDateString() === today);
        const connectedDevicesList = (0, device_handler_1.getConnectedDevices)();
        const statistics = {
            tickets: {
                total: allTickets.length,
                pending: operations_1.ticketOperations.getPendingTickets().length,
                served: allTickets.filter(t => t.status === 'served').length,
                called: allTickets.filter(t => t.status === 'called').length,
                today: todayTickets.length
            },
            devices: {
                connected: connectedDevicesList.length,
                byType: {}
            },
            timestamp: new Date().toISOString()
        };
        for (const device of connectedDevicesList) {
            const type = device.deviceType;
            statistics.devices.byType[type] = (statistics.devices.byType[type] || 0) + 1;
        }
        socket.emit('admin:statistics', statistics);
    });
    socket.on('admin:system-reset', () => {
        if (!isAdminSocket(socket)) {
            socket.emit('admin:unauthorized', {
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        socket.broadcast.emit(socket_config_1.SOCKET_EVENTS.SYSTEM_RESET, {
            message: 'System reset initiated by admin',
            timestamp: new Date().toISOString(),
            action: 'refresh-required'
        });
        socket.emit('admin:reset-completed', {
            success: true,
            timestamp: new Date().toISOString()
        });
    });
    socket.on('admin:get-devices', () => {
        if (!isAdminSocket(socket)) {
            socket.emit('admin:unauthorized', {
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        socket.emit('admin:devices', {
            devices: (0, device_handler_1.getConnectedDevices)(),
            timestamp: new Date().toISOString()
        });
    });
    socket.on('admin:message-device', ({ deviceId, message, type }) => {
        if (!isAdminSocket(socket)) {
            socket.emit('admin:unauthorized', {
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        socket.to(`device:${deviceId}`).emit('admin:message', {
            message,
            type: type || 'info',
            from: 'admin',
            timestamp: new Date().toISOString()
        });
        socket.emit('admin:message-sent', {
            deviceId,
            success: true,
            timestamp: new Date().toISOString()
        });
    });
}
function isAdminSocket(socket) {
    const rooms = Array.from(socket.rooms);
    return rooms.some(room => room === `type:${socket_config_1.DEVICE_TYPES.ADMIN}`);
}
