import { Socket } from 'socket.io';
import { SOCKET_EVENTS, DEVICE_TYPES } from '../socket.config';
import { getConnectedDevices } from './device.handler';
import { getConnectionStats } from '../socket.instance';
import { ticketOperations } from '../../db/operations';

export function handleAdminEvents(socket: Socket): void {
  // Only allow admin type devices to access these events
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
      socket: getConnectionStats(),
      devices: getConnectedDevices(),
      queue: {
        pending: ticketOperations.getPendingTickets().length,
        total: ticketOperations.getAll().length,
        served: ticketOperations.getAll().filter(t => t.status === 'served').length
      }
    };

    socket.emit('admin:system-status', systemStatus);
  });

  // Get system statistics
  socket.on('admin:get-statistics', () => {
    if (!isAdminSocket(socket)) {
      socket.emit('admin:unauthorized', {
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const allTickets = ticketOperations.getAll();
    const today = new Date().toDateString();
    const todayTickets = allTickets.filter(ticket =>
      new Date(ticket.created_at).toDateString() === today
    );

    const connectedDevicesList = getConnectedDevices();
    const statistics = {
      tickets: {
        total: allTickets.length,
        pending: ticketOperations.getPendingTickets().length,
        served: allTickets.filter(t => t.status === 'served').length,
        called: allTickets.filter(t => t.status === 'called').length,
        today: todayTickets.length
      },
      devices: {
        connected: connectedDevicesList.length,
        byType: {} as Record<string, number>
      },
      timestamp: new Date().toISOString()
    };

    // Count devices by type
    for (const device of connectedDevicesList) {
      const type = device.deviceType;
      statistics.devices.byType[type] = (statistics.devices.byType[type] || 0) + 1;
    }

    socket.emit('admin:statistics', statistics);
  });

  // Force system reset (admin only)
  socket.on('admin:system-reset', () => {
    if (!isAdminSocket(socket)) {
      socket.emit('admin:unauthorized', {
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Broadcast system reset to all clients
    socket.broadcast.emit(SOCKET_EVENTS.SYSTEM_RESET, {
      message: 'System reset initiated by admin',
      timestamp: new Date().toISOString(),
      action: 'refresh-required'
    });

    socket.emit('admin:reset-completed', {
      success: true,
      timestamp: new Date().toISOString()
    });
  });

  // Get device list (admin only)
  socket.on('admin:get-devices', () => {
    if (!isAdminSocket(socket)) {
      socket.emit('admin:unauthorized', {
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    socket.emit('admin:devices', {
      devices: getConnectedDevices(),
      timestamp: new Date().toISOString()
    });
  });

  // Send message to specific device (admin only)
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

function isAdminSocket(socket: Socket): boolean {
  // Check if socket is registered as admin device
  // This would typically check the device type from registration
  const rooms = Array.from(socket.rooms);
  return rooms.some(room => room === `type:${DEVICE_TYPES.ADMIN}`);
}
