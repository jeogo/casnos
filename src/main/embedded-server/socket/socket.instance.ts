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
      // Silent connection handling
      const clientIP = socket.handshake.address;

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔌 Socket connected: ${socket.id} from ${clientIP}`);
      }
    });

    // Setup error handling
    io.engine.on('connection_error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Socket connection error:', err);
      }
    });

    const localIP = ip.address();
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔌 Socket.IO server initialized on ${localIP}`);
      console.log(`📡 Accepting connections from LAN devices`);
    }
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
  } else {
    // Silent handling - production mode
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
  } else {
    // Silent handling
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
  } else {
    // Silent handling
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
  } else {
    // Silent handling
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
    io.close();
    io = null;
  }
}
