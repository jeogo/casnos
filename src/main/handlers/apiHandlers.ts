// 🌐 API Handlers - معالجات API للاتصال بالخادم
import { ipcMain } from 'electron'
import { getNetworkServerInfo } from './networkHandlers'

// Global server configuration
let currentBaseURL: string = ''

// Helper function to get base URL
function getBaseURL(): string {
  const serverInfo = getNetworkServerInfo()
  if (serverInfo.ip && serverInfo.port) {
    currentBaseURL = `http://${serverInfo.ip}:${serverInfo.port}`
    return currentBaseURL
  }

  // No fallback - must have discovered server info
  throw new Error('[API] No server discovered. Please ensure server is running and discoverable on network.')
}

// Helper function for fetch with error handling
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const baseURL = getBaseURL()
  const url = `${baseURL}${endpoint}`

  const defaultOptions = {
    timeout: 8000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`[API] Error fetching ${endpoint}:`, error)
    throw error
  }
}

export function setupAPIHandlers() {
  console.log('[HANDLERS] 🌐 Setting up API handlers...')

  // 🎫 Tickets API Handlers
  ipcMain.handle('api:create-ticket', async (_event, serviceId: number) => {
    try {
      return await fetchAPI('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ service_id: serviceId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-tickets', async () => {
    try {
      return await fetchAPI('/api/tickets')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-ticket-by-id', async (_event, ticketId: number) => {
    try {
      return await fetchAPI(`/api/tickets/${ticketId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:call-ticket', async (_event, ticketId: number, windowId: string) => {
    try {
      return await fetchAPI('/api/tickets/call', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: ticketId, window_id: windowId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:serve-ticket', async (_event, ticketId: number, windowId?: string) => {
    try {
      return await fetchAPI(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'served', window_label: windowId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-ticket-status', async (_event, ticketId: number, status: string, windowId?: string) => {
    try {
      return await fetchAPI(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, window_id: windowId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:delete-ticket', async (_event, ticketId: number) => {
    try {
      return await fetchAPI(`/api/tickets/${ticketId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-pending-tickets', async () => {
    try {
      return await fetchAPI('/api/tickets/pending')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-tickets-by-service', async (_event, serviceId: number) => {
    try {
      return await fetchAPI(`/api/tickets/service/${serviceId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-ticket-statistics', async () => {
    try {
      return await fetchAPI('/api/tickets/statistics')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-queue-status', async () => {
    try {
      return await fetchAPI('/api/queue/status')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-recent-tickets', async (_event, limit?: number) => {
    try {
      const endpoint = limit ? `/api/tickets/recent?limit=${limit}` : '/api/tickets/recent'
      return await fetchAPI(endpoint)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:call-next-ticket', async (_event, windowId: number) => {
    try {
      return await fetchAPI('/api/tickets/call-next', {
        method: 'POST',
        body: JSON.stringify({ window_id: windowId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-print-status', async (_event, ticketId: number, printStatus: string, errorMessage?: string) => {
    try {
      return await fetchAPI(`/api/tickets/${ticketId}/print-status`, {
        method: 'PUT',
        body: JSON.stringify({ print_status: printStatus, error_message: errorMessage })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🏢 Services API Handlers
  ipcMain.handle('api:get-services', async () => {
    try {
      return await fetchAPI('/api/services')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-service-by-id', async (_event, serviceId: number) => {
    try {
      return await fetchAPI(`/api/services/${serviceId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:create-service', async (_event, name: string) => {
    try {
      return await fetchAPI('/api/services', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-service', async (_event, serviceId: number, name: string) => {
    try {
      return await fetchAPI(`/api/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:delete-service', async (_event, serviceId: number) => {
    try {
      return await fetchAPI(`/api/services/${serviceId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🪟 Windows API Handlers
  ipcMain.handle('api:get-windows', async () => {
    try {
      return await fetchAPI('/api/windows')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-window-by-id', async (_event, windowId: number) => {
    try {
      return await fetchAPI(`/api/windows/${windowId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:create-window', async (_event, active: boolean = true) => {
    try {
      return await fetchAPI('/api/windows', {
        method: 'POST',
        body: JSON.stringify({ active })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-window', async (_event, windowId: number, active?: boolean) => {
    try {
      const updateData: any = {}
      if (active !== undefined) updateData.active = active

      return await fetchAPI(`/api/windows/${windowId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:delete-window', async (_event, windowId: number) => {
    try {
      return await fetchAPI(`/api/windows/${windowId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-active-windows', async () => {
    try {
      return await fetchAPI('/api/windows/active')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:create-window-auto', async () => {
    try {
      return await fetchAPI('/api/windows/auto', {
        method: 'POST'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 👥 Employees API Handlers
  ipcMain.handle('api:get-employees', async () => {
    try {
      return await fetchAPI('/api/employees')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-active-employees', async () => {
    try {
      return await fetchAPI('/api/employees/active')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-employee-by-window', async (_event, windowNumber: string) => {
    try {
      return await fetchAPI(`/api/employees/window/${windowNumber}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:create-employee-window', async (_event, windowNumber: string, deviceId?: string, serviceId?: number) => {
    try {
      return await fetchAPI('/api/employees/window', {
        method: 'POST',
        body: JSON.stringify({ window_number: windowNumber, device_id: deviceId, service_id: serviceId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:assign-service-to-employee', async (_event, windowNumber: string, serviceId: number) => {
    try {
      return await fetchAPI(`/api/employees/window/${windowNumber}/assign-service`, {
        method: 'POST',
        body: JSON.stringify({ serviceId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:remove-service-from-employee', async (_event, windowNumber: string) => {
    try {
      return await fetchAPI(`/api/employees/window/${windowNumber}/service`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-next-window-number', async () => {
    try {
      return await fetchAPI('/api/employees/next-window-number')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:initialize-employee-session', async (_event, data: any) => {
    try {
      return await fetchAPI('/api/employees/initialize', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🖥️ Devices API Handlers
  ipcMain.handle('api:get-devices', async () => {
    try {
      return await fetchAPI('/api/devices')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-device-by-id', async (_event, deviceId: number) => {
    try {
      return await fetchAPI(`/api/devices/${deviceId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-device-by-device-id', async (_event, deviceId: string) => {
    try {
      return await fetchAPI(`/api/devices/device-id/${deviceId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:register-device', async (_event, deviceInfo: any) => {
    try {
      return await fetchAPI('/api/devices', {
        method: 'POST',
        body: JSON.stringify(deviceInfo)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-device', async (_event, deviceId: number, deviceInfo: any) => {
    try {
      return await fetchAPI(`/api/devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify(deviceInfo)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-device-status', async (_event, deviceId: string, status: string) => {
    try {
      return await fetchAPI(`/api/devices/${deviceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:delete-device', async (_event, deviceId: number) => {
    try {
      return await fetchAPI(`/api/devices/${deviceId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-online-devices', async () => {
    try {
      return await fetchAPI('/api/devices/online')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-devices-by-type', async (_event, type: string) => {
    try {
      return await fetchAPI(`/api/devices/type/${type}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🔧 System Management Handlers
  ipcMain.handle('system:reset', async () => {
    try {
      return await fetchAPI('/api/tickets/reset', {
        method: 'POST'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('system:health', async () => {
    try {
      return await fetchAPI('/api/health')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('system:network-info', async () => {
    try {
      return await fetchAPI('/api/network')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('system:notification-permission', async () => {
    try {
      // This would be handled in renderer process
      return { success: true, permission: 'granted' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🔗 Connection Management
  ipcMain.handle('connect-to-server', async (_event, ip: string, port: number) => {
    try {
      // Update network server info
      const { updateNetworkServerInfo } = require('./networkHandlers')
      updateNetworkServerInfo(ip, port)

      // Test connection
      const baseURL = `http://${ip}:${port}`
      const response = await fetch(`${baseURL}/api/health`)

      if (response.ok) {
        return { success: true, connected: true, server: { ip, port } }
      } else {
        return { success: false, connected: false, error: 'Server not responding' }
      }
    } catch (error) {
      return { success: false, connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('get-server-status', async () => {
    try {
      const result = await fetchAPI('/api/health')
      return { success: true, status: 'connected', health: result }
    } catch (error) {
      return { success: false, status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('get-connection-status', async () => {
    const serverInfo = getNetworkServerInfo()
    return {
      success: true,
      connected: !!(serverInfo.ip && serverInfo.port),
      server: serverInfo
    }
  })

  console.log('[HANDLERS] ✅ API handlers registered successfully')
}
