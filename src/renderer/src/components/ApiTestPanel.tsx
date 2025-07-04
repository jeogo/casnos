// 🧪 API Test Panel - لوحة اختبار شاملة لجميع وظائف الـ API
import React, { useState, useEffect } from 'react'

export const ApiTestPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [serverInfo, setServerInfo] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  // Helper function to add log
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`
    setLogs(prev => [...prev, logMessage])
    console.log(logMessage)
  }

  // Test network discovery
  const testNetworkDiscovery = async () => {
    try {
      addLog('Testing network discovery...', 'info')
      const result = await window.api.discoverServerUdp()
      if (result) {
        addLog(`Server discovered: ${result.ip}:${result.port}`, 'success')
        setServerInfo(result)
      } else {
        addLog('No server found via UDP discovery', 'error')
      }
    } catch (error) {
      addLog(`Network discovery error: ${error}`, 'error')
    }
  }

  // Test server connection
  const testServerConnection = async () => {
    try {
      addLog('Testing server connection...', 'info')
      const status = await window.api.getConnectionStatus()
      addLog(`Connection status: ${JSON.stringify(status)}`, 'info')
      setIsConnected(status.connected)

      if (status.connected) {
        const health = await window.api.getServerStatus()
        addLog(`Server health: ${JSON.stringify(health)}`, 'success')
      }
    } catch (error) {
      addLog(`Server connection error: ${error}`, 'error')
    }
  }

  // Test Socket connection
  const testSocketConnection = async () => {
    try {
      addLog('Testing Socket.IO connection...', 'info')
      const deviceInfo = {
        type: 'test-device',
        name: 'API Test Panel',
        timestamp: new Date().toISOString()
      }

      const result = await window.api.connectSocket('http://localhost:3001', deviceInfo)
      addLog(`Socket connection result: ${JSON.stringify(result)}`, result.success ? 'success' : 'error')

      // Test socket status
      const status = await window.api.isSocketConnected()
      addLog(`Socket status: ${JSON.stringify(status)}`, 'info')
    } catch (error) {
      addLog(`Socket connection error: ${error}`, 'error')
    }
  }

  // Test tickets API
  const testTicketsAPI = async () => {
    try {
      addLog('Testing Tickets API...', 'info')

      // Get all tickets
      const allTickets = await window.api.getTickets()
      addLog(`Retrieved ${allTickets?.data?.length || 0} tickets`, 'success')
      setTickets(allTickets?.data || [])

      // Get pending tickets
      const pendingTickets = await window.api.getPendingTickets()
      addLog(`Pending tickets: ${pendingTickets?.data?.length || 0}`, 'info')

      // Get queue status
      const queueStatus = await window.api.getQueueStatus()
      addLog(`Queue status: ${JSON.stringify(queueStatus)}`, 'info')

      // Get ticket statistics
      const stats = await window.api.getTicketStatistics()
      addLog(`Statistics: ${JSON.stringify(stats)}`, 'info')
    } catch (error) {
      addLog(`Tickets API error: ${error}`, 'error')
    }
  }

  // Test services API
  const testServicesAPI = async () => {
    try {
      addLog('Testing Services API...', 'info')

      const servicesData = await window.api.getServices()
      addLog(`Retrieved ${servicesData?.data?.length || 0} services`, 'success')
      setServices(servicesData?.data || [])
    } catch (error) {
      addLog(`Services API error: ${error}`, 'error')
    }
  }

  // Test windows API
  const testWindowsAPI = async () => {
    try {
      addLog('Testing Windows API...', 'info')

      const windows = await window.api.getWindows()
      addLog(`Retrieved ${windows?.data?.length || 0} windows`, 'success')

      const activeWindows = await window.api.getActiveWindows()
      addLog(`Active windows: ${activeWindows?.data?.length || 0}`, 'info')
    } catch (error) {
      addLog(`Windows API error: ${error}`, 'error')
    }
  }

  // Test employees API
  const testEmployeesAPI = async () => {
    try {
      addLog('Testing Employees API...', 'info')

      const employees = await window.api.getEmployees()
      addLog(`Retrieved ${employees?.data?.length || 0} employees`, 'success')

      const activeEmployees = await window.api.getActiveEmployees()
      addLog(`Active employees: ${activeEmployees?.data?.length || 0}`, 'info')
    } catch (error) {
      addLog(`Employees API error: ${error}`, 'error')
    }
  }

  // Test devices API
  const testDevicesAPI = async () => {
    try {
      addLog('Testing Devices API...', 'info')

      const devices = await window.api.getDevices()
      addLog(`Retrieved ${devices?.data?.length || 0} devices`, 'success')

      const onlineDevices = await window.api.getOnlineDevices()
      addLog(`Online devices: ${onlineDevices?.data?.length || 0}`, 'info')
    } catch (error) {
      addLog(`Devices API error: ${error}`, 'error')
    }
  }

  // Test printing functionality
  const testPrinting = async () => {
    try {
      addLog('Testing Printing functionality...', 'info')

      const printers = await window.api.getLocalPrinters()
      addLog(`Found ${printers?.length || 0} local printers`, 'success')

      // Test audio
      const audioEnabled = await window.api.audioIsEnabled()
      addLog(`Audio enabled: ${audioEnabled.enabled}`, 'info')
    } catch (error) {
      addLog(`Printing test error: ${error}`, 'error')
    }
  }

  // Create test ticket
  const createTestTicket = async () => {
    if (!services.length) {
      addLog('No services available. Load services first.', 'error')
      return
    }

    try {
      addLog('Creating test ticket...', 'info')
      const serviceId = services[0].id
      const result = await window.api.createTicket(serviceId)
      addLog(`Ticket created: ${JSON.stringify(result)}`, 'success')

      // Refresh tickets
      testTicketsAPI()
    } catch (error) {
      addLog(`Create ticket error: ${error}`, 'error')
    }
  }

  // Setup Socket event listeners
  useEffect(() => {
    addLog('Setting up Socket event listeners...', 'info')

    const removeListeners: (() => void)[] = []

    // Listen for ticket events
    const ticketCreated = window.api.onSocketEvent('ticket-created', (data: any) => {
      addLog(`[SOCKET] Ticket created: ${JSON.stringify(data)}`, 'success')
    })
    removeListeners.push(ticketCreated)

    const ticketCalled = window.api.onSocketEvent('ticket-called', (data: any) => {
      addLog(`[SOCKET] Ticket called: ${JSON.stringify(data)}`, 'success')
    })
    removeListeners.push(ticketCalled)

    const ticketServed = window.api.onSocketEvent('ticket-served', (data: any) => {
      addLog(`[SOCKET] Ticket served: ${JSON.stringify(data)}`, 'success')
    })
    removeListeners.push(ticketServed)

    const queueUpdated = window.api.onSocketEvent('queue-updated', (data: any) => {
      addLog(`[SOCKET] Queue updated: ${JSON.stringify(data)}`, 'info')
    })
    removeListeners.push(queueUpdated)

    return () => {
      removeListeners.forEach(remove => remove())
    }
  }, [])

  // Run all basic tests
  const runAllTests = async () => {
    addLog('🚀 Running comprehensive API test suite...', 'info')
    setLogs([])

    await testNetworkDiscovery()
    await testServerConnection()
    await testSocketConnection()
    await testServicesAPI()
    await testTicketsAPI()
    await testWindowsAPI()
    await testEmployeesAPI()
    await testDevicesAPI()
    await testPrinting()

    addLog('✅ All tests completed!', 'success')
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🧪 API Test Panel</h1>
        <p className="text-gray-600 mb-6">
          شاشة اختبار شاملة لجميع وظائف النظام - API وSocket.IO
        </p>

        {/* Status indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800">Server Status</h3>
            <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </p>
            {serverInfo && (
              <p className="text-xs text-blue-600">{serverInfo.ip}:{serverInfo.port}</p>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Tickets</h3>
            <p className="text-sm text-green-600">{tickets.length} tickets loaded</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800">Services</h3>
            <p className="text-sm text-purple-600">{services.length} services loaded</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={runAllTests}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🚀 Run All Tests
          </button>

          <button
            onClick={testNetworkDiscovery}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🌐 Test Network
          </button>

          <button
            onClick={testSocketConnection}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔌 Test Socket
          </button>

          <button
            onClick={createTestTicket}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🎫 Create Ticket
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={testTicketsAPI}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🎫 Test Tickets
          </button>

          <button
            onClick={testServicesAPI}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🏢 Test Services
          </button>

          <button
            onClick={testWindowsAPI}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🪟 Test Windows
          </button>

          <button
            onClick={clearLogs}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🗑️ Clear Logs
          </button>
        </div>

        {/* Logs display */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">Console Logs</h3>
            <span className="text-gray-400 text-xs">{logs.length} entries</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet. Run tests to see output...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 break-words">
                {log.includes('ERROR') ? (
                  <span className="text-red-400">{log}</span>
                ) : log.includes('SUCCESS') ? (
                  <span className="text-green-400">{log}</span>
                ) : log.includes('[SOCKET]') ? (
                  <span className="text-blue-400">{log}</span>
                ) : (
                  <span className="text-gray-300">{log}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ApiTestPanel
