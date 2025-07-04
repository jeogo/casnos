// Socket.IO Professional Implementation
// Main entry point for all socket functionality

export { initializeSocket, getSocketIO, emitToAll, emitToRoom, emitToDevice, broadcastToAll, getConnectionStats, closeSocket } from './socket.instance';
export { setupSocketHandlers } from './socket.handler';
export { SOCKET_EVENTS, SOCKET_ROOMS, DEVICE_TYPES, socketConfig } from './socket.config';

// Handler exports
export { handleTicketEvents } from './handlers/ticket.handler';
export { handleDeviceEvents, getConnectedDevices, cleanupStaleDevices } from './handlers/device.handler';
export { handleAdminEvents } from './handlers/admin.handler';

// Types for better TypeScript support
export interface SocketDeviceInfo {
  deviceId: string;
  deviceType: string;
  name?: string;
  ip_address?: string;
  capabilities?: string[];
}

export interface SocketTicketData {
  id: number;
  ticket_number: string;
  service_id: number;
  service_name: string;
  status: 'pending' | 'called' | 'served';
  created_at: string;
  called_at?: string;
  window_label?: string;
}

export interface SocketResponse {
  success: boolean;
  message?: string;
  data?: any;
  timestamp: string;
}
