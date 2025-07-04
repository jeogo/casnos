import { Socket } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOMS, DEVICE_TYPES } from '../socket.config';
import { deviceOperations } from '../../db/operations';
import { emitToAll, emitToRoom } from '../socket.instance';

// Map to track connected devices
const connectedDevices = new Map<string, {
  socketId: string;
  deviceType: string;
  lastSeen: number;
  deviceInfo?: any;
}>();

export function handleDeviceEvents(socket: Socket): void {
  // Handle device registration
  socket.on(SOCKET_EVENTS.DEVICE_REGISTER, async (deviceInfo) => {
    try {
      console.log(`📱 Device registration attempt:`, deviceInfo);

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

      // Store device connection info
      connectedDevices.set(deviceId, {
        socketId: socket.id,
        deviceType: deviceType || DEVICE_TYPES.DISPLAY,
        lastSeen: Date.now(),
        deviceInfo
      });

      // Try to create or update device in database
      let device;
      try {
        // Try to create the device first
        device = deviceOperations.create({
          device_id: deviceId,
          name: name || `${deviceType} Device`,
          ip_address: ip_address,
          device_type: deviceType,
          status: 'online'
        });
      } catch (createError) {
        // If creation fails (device might exist), try to update status
        device = deviceOperations.updateStatus(deviceId, 'online');
      }

      // Join device-specific rooms
      socket.join(`device:${deviceId}`);
      socket.join(`type:${deviceType}`);

      // Join room based on device type
      switch (deviceType) {
        case DEVICE_TYPES.DISPLAY:
          socket.join(SOCKET_ROOMS.DISPLAYS);
          break;
        case DEVICE_TYPES.WINDOW:
          socket.join(SOCKET_ROOMS.WINDOWS);
          break;
        case DEVICE_TYPES.CUSTOMER:
          socket.join(SOCKET_ROOMS.CUSTOMERS);
          break;
        case DEVICE_TYPES.PRINTER:
          socket.join(SOCKET_ROOMS.PRINTERS);
          break;
        case DEVICE_TYPES.ADMIN:
          socket.join('admins');
          break;
      }

      // Confirm registration
      socket.emit(SOCKET_EVENTS.DEVICE_REGISTERED, {
        success: true,
        device: device || { device_id: deviceId, device_type: deviceType, status: 'online' },
        timestamp: new Date().toISOString()
      });

      // Notify others about new device
      socket.broadcast.emit(SOCKET_EVENTS.DEVICE_CONNECTED, {
        deviceId: deviceId,
        deviceType: deviceType,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Device registered: ${deviceId} (${deviceType})`);

    } catch (error) {
      console.error('❌ Device registration error:', error);
      socket.emit(SOCKET_EVENTS.DEVICE_REGISTERED, {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle device heartbeat
  socket.on(SOCKET_EVENTS.DEVICE_HEARTBEAT, (data) => {
    if (data.deviceId) {
      const deviceInfo = connectedDevices.get(data.deviceId);
      if (deviceInfo) {
        deviceInfo.lastSeen = Date.now();
        connectedDevices.set(data.deviceId, deviceInfo);

        // Update device status in database
        deviceOperations.updateLastSeen(data.deviceId);

        // Send status update to other clients
        socket.broadcast.emit(SOCKET_EVENTS.DEVICE_STATUS, {
          deviceId: data.deviceId,
          status: 'online',
          lastSeen: new Date().toISOString(),
          ...data
        });
      }
    }
  });

  // Handle disconnection cleanup
  socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    console.log(`🔌 Device disconnected: ${socket.id} (${reason})`);

    // Find and clean up device
    for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
      if (deviceInfo.socketId === socket.id) {
        // Remove from tracking
        connectedDevices.delete(deviceId);

        // Update status in database
        deviceOperations.updateStatus(deviceId, 'offline');

        // Notify others about device disconnection
        emitToAll(SOCKET_EVENTS.DEVICE_DISCONNECTED, {
          deviceId,
          status: 'offline',
          reason: reason || 'connection_lost',
          timestamp: new Date().toISOString()
        });

        console.log(`📱 Device ${deviceId} marked offline`);
        break;
      }
    }
  });
}

// Export for monitoring
export function getConnectedDevices() {
  return Array.from(connectedDevices.entries()).map(([deviceId, info]) => ({
    deviceId,
    ...info,
    isOnline: Date.now() - info.lastSeen < 60000 // 1 minute threshold
  }));
}

// Cleanup stale devices (called periodically)
export function cleanupStaleDevices() {
  const staleThreshold = 2 * 60 * 1000; // 2 minutes
  const now = Date.now();

  for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
    if (now - deviceInfo.lastSeen > staleThreshold) {
      console.log(`🧹 Cleaning up stale device: ${deviceId}`);

      // Remove from tracking
      connectedDevices.delete(deviceId);

      // Update database
      deviceOperations.updateStatus(deviceId, 'offline');

      // Notify clients
      emitToAll(SOCKET_EVENTS.DEVICE_STATUS, {
        deviceId,
        status: 'offline',
        reason: 'stale_connection',
        timestamp: new Date().toISOString()
      });
    }
  }
}
