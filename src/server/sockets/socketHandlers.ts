import { Server as SocketIOServer, Socket } from 'socket.io'
import { ticketOperations, deviceOperations } from '../db/database'
// logger removed

// Store connected devices and their socket IDs for targeted messaging
const connectedDevices = new Map<string, { socketId: string, deviceType: string, lastSeen: number }>()

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {


    // Send comprehensive initial data to newly connected client
    const initialData = {
      pendingTickets: ticketOperations.getPendingTickets(),
      allTickets: ticketOperations.getAll(),
      connectedDevices: Array.from(connectedDevices.keys()),
      serverTime: new Date().toISOString(),
      timestamp: Date.now()
    }

    socket.emit('initial-data', initialData)


    // Handle client requesting current queue status (real-time)
    socket.on('get-queue-status', () => {
      const pendingTickets = ticketOperations.getPendingTickets()
      socket.emit('queue-status', {
        pending: pendingTickets.length,
        tickets: pendingTickets,
        timestamp: new Date().toISOString()
      })
    })

    // Handle client requesting all tickets (real-time)
    socket.on('get-all-tickets', () => {
      const allTickets = ticketOperations.getAll()
      socket.emit('all-tickets', {
        tickets: allTickets,
        count: allTickets.length,
        timestamp: new Date().toISOString()
      })
    })

    // Handle client requesting tickets by service (real-time)
    socket.on('get-tickets-by-service', (serviceId: number) => {
      const tickets = ticketOperations.getByServiceId(serviceId)
      socket.emit('tickets-by-service', {
        serviceId,
        tickets,
        count: tickets.length,
        timestamp: new Date().toISOString()
      })
    })

    // Handle device registration with enhanced real-time tracking
    socket.on('device:register', (deviceInfo) => {
      try {


        if (deviceInfo.deviceId) {
          // Store device connection info for real-time tracking
          connectedDevices.set(deviceInfo.deviceId, {
            socketId: socket.id,
            deviceType: deviceInfo.deviceType || 'unknown',
            lastSeen: Date.now()
          })

          // Update device status to online
          const updatedDevice = deviceOperations.updateStatus(deviceInfo.deviceId, 'online')
          if (updatedDevice) {


            // Confirm registration to the device
            socket.emit('device:registered', {
              success: true,
              device: updatedDevice,
              serverTime: new Date().toISOString()
            })

            // Broadcast device connection to all other clients
            socket.broadcast.emit('device:connected', {
              deviceId: deviceInfo.deviceId,
              deviceType: deviceInfo.deviceType,
              timestamp: new Date().toISOString()
            })

            // Join device-specific room for targeted messaging
            socket.join(`device:${deviceInfo.deviceId}`)
            socket.join(`type:${deviceInfo.deviceType}`)


          } else {

            socket.emit('device:registered', {
              success: false,
              message: 'Device not found',
              serverTime: new Date().toISOString()
            })
          }
        }
      } catch (error) {

        socket.emit('device:registered', {
          success: false,
          message: 'Registration failed',
          error: error instanceof Error ? error.message : String(error),
          serverTime: new Date().toISOString()
        })
      }
    })

    // Enhanced device heartbeat with real-time status
    socket.on('device:heartbeat', (heartbeatData) => {
      try {
        if (heartbeatData.deviceId) {
          // Update device connection tracking
          const deviceInfo = connectedDevices.get(heartbeatData.deviceId)
          if (deviceInfo) {
            deviceInfo.lastSeen = Date.now()
            connectedDevices.set(heartbeatData.deviceId, deviceInfo)
          }

          // Update database
          deviceOperations.updateLastSeen(heartbeatData.deviceId)


          // Send real-time status update to all clients
          socket.broadcast.emit('device:status-update', {
            deviceId: heartbeatData.deviceId,
            status: 'online',
            lastSeen: new Date().toISOString(),
            ...heartbeatData
          })
        }
      } catch (error) {

      }
    })

    // Real-time ticket updates when tickets are created/modified
    socket.on('ticket:created', (ticketData) => {


      // Broadcast to all connected clients immediately
      io.emit('ticket:new', {
        ticket: ticketData,
        timestamp: new Date().toISOString()
      })

      // Send to specific device types
      io.to('type:display').emit('display:update-queue', {
        action: 'new_ticket',
        ticket: ticketData,
        timestamp: new Date().toISOString()
      })

      // Update queue statistics
      const queueStats = {
        pending: ticketOperations.getPendingTickets().length,
        total: ticketOperations.getAll().length,
        timestamp: new Date().toISOString()
      }

      io.emit('queue:stats-update', queueStats)
    })

    // Real-time ticket status updates
    socket.on('ticket:status-changed', (data) => {
      const { ticketId, oldStatus, newStatus, employeeId, windowId } = data


      // Broadcast status change to all clients
      io.emit('ticket:status-update', {
        ticketId,
        oldStatus,
        newStatus,
        employeeId,
        windowId,
        timestamp: new Date().toISOString()
      })

      // Send targeted updates to specific device types
      if (newStatus === 'called') {
        // Notify display screens
        io.to('type:display').emit('display:ticket-called', {
          ticketId,
          windowId,
          timestamp: new Date().toISOString()
        })
      }

      // Update queue stats in real-time
      const queueStats = {
        pending: ticketOperations.getPendingTickets().length,
        total: ticketOperations.getAll().length,
        timestamp: new Date().toISOString()
      }

      io.emit('queue:stats-update', queueStats)
    })

    // Enhanced print job handling with real-time feedback
    socket.on('print-job-completed', async (data) => {
      try {
        const { ticketId, success, duration, error } = data

        if (success) {
          const updatedTicket = ticketOperations.updatePrintStatus(ticketId, 'printed')


          // Notify all clients immediately
          io.emit('print:status-updated', {
            ticketId,
            printStatus: 'printed',
            ticket: updatedTicket,
            duration,
            timestamp: new Date().toISOString()
          })
        } else {
          const updatedTicket = ticketOperations.updatePrintStatus(ticketId, 'print_failed')


          // Notify all clients with error details
          io.emit('print:status-updated', {
            ticketId,
            printStatus: 'print_failed',
            ticket: updatedTicket,
            error,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {

      }
    })

    // Real-time print job acknowledgment
    socket.on('print-job-received', (data) => {
      const { ticketId, deviceId } = data


      // Send real-time confirmation to all clients
      io.emit('print:job-acknowledged', {
        ticketId,
        deviceId,
        timestamp: new Date().toISOString()
      })
    })

    // Handle client disconnect with cleanup
    socket.on('disconnect', (reason) => {


      // Clean up device tracking
      for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
        if (deviceInfo.socketId === socket.id) {
          connectedDevices.delete(deviceId)

          // Update device status to offline
          deviceOperations.updateStatus(deviceId, 'offline')

          // Notify other clients
          socket.broadcast.emit('device:disconnected', {
            deviceId,
            timestamp: new Date().toISOString()
          })

          // logger removed
          break
        }
      }
    })

    // Enhanced ping/pong with connection quality info
    socket.on('ping', (data = {}) => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
        clientTime: data.clientTime,
        roundTripTime: data.clientTime ? Date.now() - data.clientTime : null
      })
    })

    // Real-time window assignments
    socket.on('window:assigned', (data) => {
      const { windowId, employeeId, serviceId } = data
      // logger removed

      io.emit('window:assignment-update', {
        windowId,
        employeeId,
        serviceId,
        timestamp: new Date().toISOString()
      })
    })

    // Socket message handlers setup complete

    // Emergency broadcast support
    socket.on('emergency:broadcast', (data) => {
      // logger removed

      io.emit('emergency:alert', {
        ...data,
        timestamp: new Date().toISOString(),
        severity: data.severity || 'high'
      })
    })
  })

  // High-frequency real-time updates (every 5 seconds)
  setInterval(() => {
    const pendingTickets = ticketOperations.getPendingTickets()
    const allTickets = ticketOperations.getAll()

    io.emit('realtime:queue-update', {
      pending: pendingTickets.length,
      total: allTickets.length,
      tickets: pendingTickets,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    })
  }, 5000) // Every 5 seconds

  // Device health check (every 30 seconds)
  setInterval(() => {
    const now = Date.now()
    const staleThreshold = 60000 // 1 minute

    for (const [deviceId, deviceInfo] of connectedDevices.entries()) {
      if (now - deviceInfo.lastSeen > staleThreshold) {
        // logger removed

        // Mark as offline
        deviceOperations.updateStatus(deviceId, 'offline')
        connectedDevices.delete(deviceId)

        // Notify all clients
        io.emit('device:status-update', {
          deviceId,
          status: 'offline',
          reason: 'stale_connection',
          timestamp: new Date().toISOString()
        })
      }
    }
  }, 30000) // Every 30 seconds

  // logger removed
}

// Enhanced helper function to emit events with metadata
export function emitToAll(io: SocketIOServer, event: string, data: any): void {
  const enrichedData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    serverTime: Date.now()
  }

  io.emit(event, enrichedData)
  // logger removed
}

// Helper function to emit to specific device types
export function emitToDeviceType(io: SocketIOServer, deviceType: string, event: string, data: any): void {
  const enrichedData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    serverTime: Date.now()
  }

  io.to(`type:${deviceType}`).emit(event, enrichedData)
  // logger removed
}

// Helper function to emit to specific device
export function emitToDevice(io: SocketIOServer, deviceId: string, event: string, data: any): void {
  const enrichedData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    serverTime: Date.now()
  }

  io.to(`device:${deviceId}`).emit(event, enrichedData)
  // logger removed
}

// Function to broadcast system reset to all clients
export function broadcastSystemReset(io: SocketIOServer): void {
  // logger removed

  io.emit('system-reset', {
    message: 'System has been reset. All tickets and cache cleared.',
    timestamp: new Date().toISOString(),
    action: 'refresh-required'
  })

  // logger removed
}
