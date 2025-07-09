"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getSocketIO = getSocketIO;
exports.emitToAll = emitToAll;
exports.emitToRoom = emitToRoom;
exports.emitToDevice = emitToDevice;
exports.broadcastToAll = broadcastToAll;
exports.getConnectionStats = getConnectionStats;
exports.closeSocket = closeSocket;
const socket_io_1 = require("socket.io");
const socket_config_1 = require("./socket.config");
const ip_1 = __importDefault(require("ip"));
let io = null;
function initializeSocket(httpServer) {
    if (!io) {
        io = new socket_io_1.Server(httpServer, socket_config_1.socketConfig);
        io.on('connection', (socket) => {
            const clientIP = socket.handshake.address;
            const userAgent = socket.handshake.headers['user-agent'];
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔌 Socket connected: ${socket.id} from ${clientIP}`);
            }
        });
        io.engine.on('connection_error', (err) => {
            if (process.env.NODE_ENV === 'development') {
                console.error('Socket connection error:', err);
            }
        });
        const localIP = ip_1.default.address();
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔌 Socket.IO server initialized on ${localIP}`);
            console.log(`📡 Accepting connections from LAN devices`);
        }
    }
    return io;
}
function getSocketIO() {
    return io;
}
function emitToAll(event, data) {
    if (io) {
        const enrichedData = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            serverTime: Date.now()
        };
        io.emit(event, enrichedData);
    }
    else {
    }
}
function emitToRoom(room, event, data) {
    if (io) {
        const enrichedData = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            serverTime: Date.now()
        };
        io.to(room).emit(event, enrichedData);
    }
    else {
    }
}
function emitToDevice(deviceId, event, data) {
    if (io) {
        const enrichedData = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            serverTime: Date.now()
        };
        io.to(`device:${deviceId}`).emit(event, enrichedData);
    }
    else {
    }
}
function broadcastToAll(event, data) {
    if (io) {
        const enrichedData = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            serverTime: Date.now()
        };
        io.sockets.emit(event, enrichedData);
    }
    else {
    }
}
function getConnectionStats() {
    if (!io)
        return null;
    const adapter = io.sockets.adapter;
    const rooms = Array.from(adapter.rooms.keys()).filter(room => !adapter.sids.has(room));
    return {
        totalConnections: io.sockets.sockets.size,
        rooms: rooms.map(room => ({
            name: room,
            clients: adapter.rooms.get(room)?.size || 0
        })),
        timestamp: new Date().toISOString()
    };
}
function closeSocket() {
    if (io) {
        io.close();
        io = null;
    }
}
