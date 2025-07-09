// 🌐 API Handlers - معالجات API للاتصال بالخادم
import { ipcMain } from 'electron'
import { getNetworkServerInfo, updateNetworkServerInfo } from './networkHandlers'

// Global server configuration
let currentBaseURL: string = ''

// Helper function to get base URL
function getBaseURL(): string {
  try {
    const serverInfo = getNetworkServerInfo()
    if (serverInfo.ip && serverInfo.port) {
      currentBaseURL = `http://${serverInfo.ip}:${serverInfo.port}`
      return currentBaseURL
    }
    throw new Error('No server info available')
  } catch (error) {
    throw new Error(`[API] No server discovered. Please ensure server is running and discoverable on network. Details: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
  ipcMain.handle('api:create-ticket', async (_event, serviceId: number, printType?: 'local' | 'network') => {
    try {
      const requestBody: any = { service_id: serviceId }
      if (printType) {
        requestBody.print_type = printType
      }

      return await fetchAPI('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(requestBody)
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

  // ✅ NEW: Call next ticket for specific window with service filtering
  ipcMain.handle('api:call-next-for-window', async (_event, windowId: number, serviceId?: number, currentTicketId?: number) => {
    try {
      console.log('[API-HANDLER] 🎫 Call next ticket for window - RECEIVED:', { windowId, serviceId, currentTicketId })
      const requestBody: any = { window_id: windowId }
      if (serviceId) requestBody.service_id = serviceId
      if (currentTicketId) requestBody.current_ticket_id = currentTicketId

      console.log('[API-HANDLER] Making API request with body:', requestBody)

      const apiResult = await fetchAPI('/api/tickets/call-next-for-window', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      console.log('[API-HANDLER] API response received:', apiResult)
      return apiResult
    } catch (error) {
      console.error('[API-HANDLER] ❌ Error calling next ticket:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  console.log('[API-HANDLER] ✅ api:call-next-for-window handler registered')

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

  ipcMain.handle('api:update-window', async (_event, windowId: number, serviceId?: number, active?: boolean) => {
    try {
      const updateData: any = {}
      if (serviceId !== undefined) updateData.service_id = serviceId
      if (active !== undefined) updateData.active = active

      console.log('[IPC-HANDLER] 🔄 Updating window:', windowId, 'with data:', updateData)

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

  ipcMain.handle('api:assign-service-to-window', async (_event, windowId: number, serviceId: number) => {
    try {
      return await fetchAPI(`/api/windows/${windowId}/assign-service`, {
        method: 'PUT',
        body: JSON.stringify({ service_id: serviceId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:remove-service-from-window', async (_event, windowId: number) => {
    try {
      return await fetchAPI(`/api/windows/${windowId}/remove-service`, {
        method: 'PUT'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🪟 Window-Device API Handlers
  ipcMain.handle('api:register-device-window', async (_event, deviceId: string, serviceId?: number) => {
    try {
      return await fetchAPI('/api/windows/register-device', {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId, service_id: serviceId })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-window-by-device-id', async (_event, deviceId: string) => {
    try {
      return await fetchAPI(`/api/windows/device/${deviceId}`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:activate-device-window', async (_event, deviceId: string) => {
    try {
      return await fetchAPI(`/api/windows/device/${deviceId}/activate`, {
        method: 'PUT'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:deactivate-device-window', async (_event, deviceId: string) => {
    try {
      return await fetchAPI(`/api/windows/device/${deviceId}/deactivate`, {
        method: 'PUT'
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

  // �️ Device Printers API Handlers
  ipcMain.handle('api:get-device-printers', async () => {
    try {
      console.log('[API] Fetching device printers from /api/devices/printers/all')
      const result = await fetchAPI('/api/devices/printers/all')
      console.log('[API] Device printers result:', result)
      return result
    } catch (error) {
      console.error('[API] Error fetching device printers:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-device-printers-by-device', async (_event, deviceId: string) => {
    try {
      return await fetchAPI(`/api/devices/${deviceId}/printers`)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:create-device-printer', async (_event, printerData: any) => {
    try {
      // Need to specify device ID for creation route
      const deviceId = printerData.device_id || 'default'
      return await fetchAPI(`/api/devices/${deviceId}/printers`, {
        method: 'POST',
        body: JSON.stringify(printerData)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-device-printer', async (_event, printerId: number, printerData: any) => {
    try {
      return await fetchAPI(`/api/devices/printers/${printerId}`, {
        method: 'PUT',
        body: JSON.stringify(printerData)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:delete-device-printer', async (_event, printerId: number) => {
    try {
      return await fetchAPI(`/api/devices/printers/${printerId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 🗑️ Direct database deletion handler (fallback)
  ipcMain.handle('api:force-delete-printer', async (_event, printerId: number) => {
    try {
      console.log('[API] Force delete printer attempt:', printerId)

      // Try multiple approaches
      const results: Array<{method: string, success: boolean, result?: any, error?: string}> = []

      // Method 1: Regular API call
      try {
        const apiResult = await fetchAPI(`/api/devices/printers/${printerId}`, {
          method: 'DELETE'
        })
        results.push({ method: 'API', success: apiResult.success, result: apiResult })
        if (apiResult.success) {
          return { success: true, method: 'API', results }
        }
      } catch (apiError) {
        results.push({ method: 'API', success: false, error: apiError instanceof Error ? apiError.message : String(apiError) })
      }

      // Method 2: Direct HTTP to localhost
      try {
        const baseURL = getBaseURL()
        const response = await fetch(`${baseURL}/api/devices/printers/${printerId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
        const httpResult = await response.json()
        results.push({ method: 'HTTP', success: httpResult.success, result: httpResult })
        if (httpResult.success) {
          return { success: true, method: 'HTTP', results }
        }
      } catch (httpError) {
        results.push({ method: 'HTTP', success: false, error: httpError instanceof Error ? httpError.message : String(httpError) })
      }

      // Method 3: Alternative endpoint (try different port)
      try {
        const response = await fetch(`http://localhost:3001/api/devices/printers/${printerId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
        const altResult = await response.json()
        results.push({ method: 'ALT_HTTP', success: altResult.success, result: altResult })
        if (altResult.success) {
          return { success: true, method: 'ALT_HTTP', results }
        }
      } catch (altError) {
        results.push({ method: 'ALT_HTTP', success: false, error: altError instanceof Error ? altError.message : String(altError) })
      }

      return { success: false, error: 'All methods failed', results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // �🔗 Connection Management
  ipcMain.handle('connect-to-server', async (_event, ip: string, port: number) => {
    try {
      // Update network server info
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

  // 🔄 Daily Reset API Handlers
  ipcMain.handle('api:get-daily-reset-status', async () => {
    try {
      return await fetchAPI('/api/reset/status')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:get-daily-reset-statistics', async () => {
    try {
      return await fetchAPI('/api/reset/statistics')
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:force-daily-reset', async () => {
    try {
      return await fetchAPI('/api/reset/force', { method: 'POST' })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('api:update-daily-reset-config', async (_event, config: any) => {
    try {
      return await fetchAPI('/api/reset/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  console.log('[HANDLERS] ✅ API handlers registered successfully')
}
