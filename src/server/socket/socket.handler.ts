import { Server as SocketIOServer } from 'socket.io';
import { handleTicketEvents } from './handlers/ticket.handler';
import { handleDeviceEvents, cleanupStaleDevices, getConnectedDevices } from './handlers/device.handler';
import { handleAdminEvents } from './handlers/admin.handler';
import { SOCKET_EVENTS } from './socket.config';
import { ticketOperations } from '../db/operations';

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    // Send initial data to newly connected client
    const initialData = {
      pendingTickets: ticketOperations.getPendingTickets(),
      allTickets: ticketOperations.getAll(),
      connectedDevices: getConnectedDevices(),
      serverTime: new Date().toISOString(),
      timestamp: Date.now()
    };

    socket.emit(SOCKET_EVENTS.INITIAL_DATA, initialData);

    // Setup event handlers for this socket
    handleTicketEvents(socket);
    handleDeviceEvents(socket);
    handleAdminEvents(socket);

    // Display Print Handler
    socket.on(SOCKET_EVENTS.DISPLAY_PRINT_TICKET, (data) => {
      const displaysRoom = io.sockets.adapter.rooms.get('displays');
      const displayCount = displaysRoom ? displaysRoom.size : 0;

      if (displayCount === 0) {
        return;
      }

      // Forward to display screens
      io.to('displays').emit(SOCKET_EVENTS.DISPLAY_PRINT_TICKET, {
        ...data,
        serverTimestamp: new Date().toISOString()
      });

    });

    // Handle ping/pong for connection monitoring
    socket.on('ping', (data = {}) => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
        clientTime: data.clientTime,
        roundTripTime: data.clientTime ? Date.now() - data.clientTime : null
      });
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      cleanupStaleDevices();
    });
  });

  // Setup periodic tasks
  setupPeriodicTasks(io);
}

function setupPeriodicTasks(io: SocketIOServer): void {
  // Update queue status every 5 seconds
  setInterval(() => {
    const pendingTickets = ticketOperations.getPendingTickets();
    const allTickets = ticketOperations.getAll();

    io.emit(SOCKET_EVENTS.REALTIME_UPDATE, {
      pending: pendingTickets.length,
      total: allTickets.length,
      tickets: pendingTickets,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }, 5000);

  // Device health check every 30 seconds
  setInterval(() => {
    cleanupStaleDevices();
  }, 30000);

  // Emit connected devices status every minute
  setInterval(() => {
    io.emit('devices:status', {
      connectedDevices: getConnectedDevices(),
      timestamp: new Date().toISOString()
    });
  }, 60000);
}
