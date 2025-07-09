"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const ticket_handler_1 = require("./handlers/ticket.handler");
const device_handler_1 = require("./handlers/device.handler");
const admin_handler_1 = require("./handlers/admin.handler");
const socket_config_1 = require("./socket.config");
const operations_1 = require("../db/operations");
function setupSocketHandlers(io) {
    io.on(socket_config_1.SOCKET_EVENTS.CONNECT, (socket) => {
        const initialData = {
            pendingTickets: operations_1.ticketOperations.getPendingTickets(),
            allTickets: operations_1.ticketOperations.getAll(),
            connectedDevices: (0, device_handler_1.getConnectedDevices)(),
            serverTime: new Date().toISOString(),
            timestamp: Date.now()
        };
        socket.emit(socket_config_1.SOCKET_EVENTS.INITIAL_DATA, initialData);
        (0, ticket_handler_1.handleTicketEvents)(socket);
        (0, device_handler_1.handleDeviceEvents)(socket);
        (0, admin_handler_1.handleAdminEvents)(socket);
        socket.on(socket_config_1.SOCKET_EVENTS.DISPLAY_PRINT_TICKET, (data) => {
            const displaysRoom = io.sockets.adapter.rooms.get('displays');
            const displayCount = displaysRoom ? displaysRoom.size : 0;
            if (displayCount === 0) {
                return;
            }
            io.to('displays').emit(socket_config_1.SOCKET_EVENTS.DISPLAY_PRINT_TICKET, {
                ...data,
                serverTimestamp: new Date().toISOString()
            });
        });
        socket.on('ping', (data = {}) => {
            socket.emit('pong', {
                timestamp: new Date().toISOString(),
                serverTime: Date.now(),
                clientTime: data.clientTime,
                roundTripTime: data.clientTime ? Date.now() - data.clientTime : null
            });
        });
        socket.on(socket_config_1.SOCKET_EVENTS.DISCONNECT, (reason) => {
            (0, device_handler_1.cleanupStaleDevices)();
        });
    });
    setupPeriodicTasks(io);
}
function setupPeriodicTasks(io) {
    setInterval(() => {
        const pendingTickets = operations_1.ticketOperations.getPendingTickets();
        const allTickets = operations_1.ticketOperations.getAll();
        io.emit(socket_config_1.SOCKET_EVENTS.REALTIME_UPDATE, {
            pending: pendingTickets.length,
            total: allTickets.length,
            tickets: pendingTickets,
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
    }, 5000);
    setInterval(() => {
        (0, device_handler_1.cleanupStaleDevices)();
    }, 30000);
    setInterval(() => {
        io.emit('devices:status', {
            connectedDevices: (0, device_handler_1.getConnectedDevices)(),
            timestamp: new Date().toISOString()
        });
    }, 60000);
}
