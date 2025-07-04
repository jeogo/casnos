// 🔌 Socket Handlers - معالجات Socket.IO للاتصال المباشر
import { ipcMain, BrowserWindow } from 'electron'
import { io, Socket } from 'socket.io-client'
import { getNetworkServerInfo } from './networkHandlers'

// Global socket instance
let globalSocket: Socket | null = null
let isConnected: boolean = false
let autoReconnect: boolean = true
let reconnectAttempts: number = 0
let maxReconnectAttempts: number = -1 // Unlimited
let reconnectDelay: number = 1000

// Device info storage
let storedDeviceInfo: any = null

// Helper function to get socket URL
function getSocketURL(): string {
  const serverInfo = getNetworkServerInfo()
  if (serverInfo.ip && serverInfo.port) {
    return `http://${serverInfo.ip}:${serverInfo.port}`
  }
  // No fallback - must have discovered server info
  throw new Error('[SOCKET] No server discovered. Please ensure server is running and discoverable on network.')
}

// Helper function to emit to all renderer processes
function emitToAllRenderers(event: string, data: any) {
  BrowserWindow.getAllWindows().forEach(window => {
    if (window && !window.isDestroyed()) {
      window.webContents.send(`socket:event:${event}`, data)
    }
  })
}

// Socket connection management
function connectSocket(serverUrl?: string, deviceInfo?: any): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const socketUrl = serverUrl || getSocketURL()
      console.log('[SOCKET] Connecting to:', socketUrl)

      // Store device info for reconnection
      if (deviceInfo) {
        storedDeviceInfo = deviceInfo
      }

      // Disconnect existing socket
      if (globalSocket) {
        globalSocket.disconnect()
        globalSocket = null
      }

      // Create new socket connection
      globalSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        autoConnect: true,
        forceNew: true
      })

      // Connection success
      globalSocket.on('connect', () => {
        console.log('[SOCKET] ✅ Connected successfully')
        isConnected = true
        reconnectAttempts = 0

        // Register device if info provided
        if (storedDeviceInfo) {
          globalSocket?.emit('device:register', storedDeviceInfo)
        }

        // Emit connection status to renderers
        emitToAllRenderers('connection-status', { connected: true, socketId: globalSocket?.id })
        resolve(true)
      })

      // Connection error
      globalSocket.on('connect_error', (error) => {
        console.log('[SOCKET] ❌ Connection error:', error.message)
        isConnected = false

        if (autoReconnect && (maxReconnectAttempts === -1 || reconnectAttempts < maxReconnectAttempts)) {
          reconnectAttempts++
          console.log(`[SOCKET] 🔄 Reconnect attempt ${reconnectAttempts}...`)
          setTimeout(() => {
            if (!isConnected) {
              connectSocket(serverUrl, storedDeviceInfo)
            }
          }, reconnectDelay)
        }

        emitToAllRenderers('connection-status', { connected: false, error: error.message })
        resolve(false)
      })

      // Disconnection
      globalSocket.on('disconnect', (reason) => {
        console.log('[SOCKET] 🔌 Disconnected:', reason)
        isConnected = false
        emitToAllRenderers('connection-status', { connected: false, reason })

        // Auto-reconnect for unexpected disconnections
        if (autoReconnect && reason !== 'io client disconnect') {
          setTimeout(() => {
            if (!isConnected) {
              connectSocket(serverUrl, storedDeviceInfo)
            }
          }, reconnectDelay)
        }
      })

      // Listen for all real-time events and forward to renderers
      const events = [
        'ticket:created',
        'ticket:called',
        'ticket:served',
        'ticket:status-updated',
        'queue:updated',
        'device:connected',
        'device:disconnected',
        'device:registered',
        'new-ticket',
        'ticket-called',
        'realtime:queue-update',
        'initial-data',
        'queue-status',
        'all-tickets',
        'tickets-by-service',
        'print:status-updated',
        'display:ticket-called',
        'emergency:alert',
        'employee:created',
        'employee:service-assigned',
        'employee:service-removed',
        'window:assignment-update',
        'system-reset'
      ]

      events.forEach(event => {
        globalSocket?.on(event, (data) => {
          console.log(`[SOCKET] 📢 Event received: ${event}`)
          emitToAllRenderers(event, data)
        })
      })

      // Ping/Pong for connection monitoring
      globalSocket.on('pong', (data) => {
        emitToAllRenderers('pong', data)
      })

    } catch (error) {
      console.error('[SOCKET] ❌ Connection setup error:', error)
      isConnected = false
      resolve(false)
    }
  })
}

export function setupSocketHandlers() {
  console.log('[HANDLERS] 🔌 Setting up Socket handlers...')

  // Connect to socket
  ipcMain.handle('socket:connect', async (_event, serverUrl?: string, deviceInfo?: any) => {
    try {
      const connected = await connectSocket(serverUrl, deviceInfo)
      return { success: connected, connected }
    } catch (error) {
      return { success: false, connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Disconnect socket
  ipcMain.handle('socket:disconnect', async () => {
    try {
      if (globalSocket) {
        autoReconnect = false // Disable auto-reconnect for manual disconnect
        globalSocket.disconnect()
        globalSocket = null
        isConnected = false
      }
      return { success: true, connected: false }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Check connection status
  ipcMain.handle('socket:is-connected', async () => {
    return {
      success: true,
      connected: isConnected,
      socketId: globalSocket?.id || null
    }
  })

  // Register device
  ipcMain.handle('socket:register-device', async (_event, deviceInfo: any) => {
    try {
      if (globalSocket && isConnected) {
        storedDeviceInfo = deviceInfo
        globalSocket.emit('device:register', deviceInfo)
        return { success: true, registered: true }
      } else {
        return { success: false, registered: false, error: 'Socket not connected' }
      }
    } catch (error) {
      return { success: false, registered: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Emit socket event
  ipcMain.handle('socket:emit', async (_event, event: string, data?: any) => {
    try {
      if (globalSocket && isConnected) {
        globalSocket.emit(event, data)
        return { success: true, emitted: true }
      } else {
        return { success: false, emitted: false, error: 'Socket not connected' }
      }
    } catch (error) {
      return { success: false, emitted: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Enable/disable auto-reconnect
  ipcMain.handle('socket:auto-reconnect', async (_event, enabled: boolean) => {
    try {
      autoReconnect = enabled
      return { success: true, autoReconnect }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Real-time methods
  ipcMain.handle('realtime:call-ticket', async (_event, ticketId: number, windowNumber: string) => {
    try {
      if (globalSocket && isConnected) {
        // First call via API
        const { fetchAPI } = require('./apiHandlers')
        const result = await fetchAPI('/api/tickets/call', {
          method: 'POST',
          body: JSON.stringify({ ticket_id: ticketId, window_id: windowNumber })
        })

        // Then emit real-time event
        globalSocket.emit('ticket:status-changed', {
          ticketId,
          oldStatus: 'pending',
          newStatus: 'called',
          windowId: windowNumber,
          employeeId: storedDeviceInfo?.device_id
        })

        return result
      } else {
        throw new Error('Socket not connected')
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('realtime:serve-ticket', async (_event, ticketId: number, windowNumber: string) => {
    try {
      if (globalSocket && isConnected) {
        // First serve via API
        const { fetchAPI } = require('./apiHandlers')
        const result = await fetchAPI(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'served', window_label: windowNumber })
        })

        // Then emit real-time event
        globalSocket.emit('ticket:status-changed', {
          ticketId,
          oldStatus: 'called',
          newStatus: 'served',
          windowId: windowNumber,
          employeeId: storedDeviceInfo?.device_id
        })

        return result
      } else {
        throw new Error('Socket not connected')
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('realtime:create-ticket', async (_event, serviceId: number) => {
    try {
      if (globalSocket && isConnected) {
        // First create via API
        const { fetchAPI } = require('./apiHandlers')
        const result = await fetchAPI('/api/tickets', {
          method: 'POST',
          body: JSON.stringify({ service_id: serviceId })
        })

        // Then emit real-time event
        if (result.success && result.data) {
          globalSocket.emit('ticket:created', result.data)
        }

        return result
      } else {
        throw new Error('Socket not connected')
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('realtime:get-queue-status', async () => {
    try {
      if (globalSocket && isConnected) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Realtime request timeout'))
          }, 5000)

          globalSocket!.once('queue-status', (data) => {
            clearTimeout(timeout)
            resolve(data)
          })

          globalSocket!.emit('get-queue-status')
        })
      } else {
        throw new Error('Socket not connected')
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('realtime:get-tickets-by-service', async (_event, serviceId: number) => {
    try {
      if (globalSocket && isConnected) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Realtime request timeout'))
          }, 5000)

          globalSocket!.once('tickets-by-service', (data) => {
            clearTimeout(timeout)
            resolve(data)
          })

          globalSocket!.emit('get-tickets-by-service', serviceId)
        })
      } else {
        throw new Error('Socket not connected')
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  console.log('[HANDLERS] ✅ Socket handlers registered successfully')
}

// Export socket instance for other modules
export function getGlobalSocket(): Socket | null {
  return globalSocket
}

export function isSocketConnected(): boolean {
  return isConnected
}
