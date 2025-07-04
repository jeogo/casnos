import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { socketConfig } from './socket.config';
import ip from 'ip';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  if (!io) {
    io = new SocketIOServer(httpServer, socketConfig);

    // Setup connection monitoring
    io.on('connection', (socket) => {
      // Log connection details
      const clientIP = socket.handshake.address;
      const userAgent = socket.handshake.headers['user-agent'];
      console.log(`🔌 Socket connected: ${socket.id} from ${clientIP}`);
    });

    // Setup error handling
    io.engine.on('connection_error', (err) => {
      console.error('❌ Socket connection error:', err);
    });

    const localIP = ip.address();
    console.log(`🔌 Socket.IO server initialized on ${localIP}`);
    console.log(`📡 Accepting connections from LAN devices`);
  }
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitToAll(event: string, data: any): void {
  if (io) {
    const enrichedData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      serverTime: Date.now()
    };

    io.emit(event, enrichedData);
    console.log(`📡 Broadcast: ${event} to ${io.sockets.sockets.size} clients`);
  } else {
    console.warn('⚠️ Socket.IO not initialized - cannot emit to all');
  }
}

export function emitToRoom(room: string, event: string, data: any): void {
  if (io) {
    const enrichedData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      serverTime: Date.now()
    };

    io.to(room).emit(event, enrichedData);

    // Get room size for logging
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    console.log(`📡 Room emit: ${event} to "${room}" (${roomSize} clients)`);
  } else {
    console.warn(`⚠️ Socket.IO not initialized - cannot emit to room: ${room}`);
  }
}

export function emitToDevice(deviceId: string, event: string, data: any): void {
  if (io) {
    const enrichedData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      serverTime: Date.now()
    };

    io.to(`device:${deviceId}`).emit(event, enrichedData);
    console.log(`📡 Device emit: ${event} to device:${deviceId}`);
  } else {
    console.warn(`⚠️ Socket.IO not initialized - cannot emit to device: ${deviceId}`);
  }
}

export function broadcastToAll(event: string, data: any): void {
  if (io) {
    const enrichedData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      serverTime: Date.now()
    };

    io.sockets.emit(event, enrichedData);
    console.log(`📡 Broadcast: ${event} to all sockets`);
  } else {
    console.warn('⚠️ Socket.IO not initialized - cannot broadcast');
  }
}

// Utility functions for monitoring
export function getConnectionStats() {
  if (!io) return null;

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

export function closeSocket(): void {
  if (io) {
    console.log('🔌 Closing Socket.IO server...');
    io.close();
    io = null;
  }
}
