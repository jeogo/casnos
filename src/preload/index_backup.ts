import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Complete API - all functionality for queue management system
const api = {
  // 🌐 Network & Discovery
  discoverServerUdp: () => ipcRenderer.invoke('discover-server-udp'),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  updateServerInfo: (serverInfo: { ip: string; port: number }) => ipcRenderer.invoke('update-server-info', serverInfo),
  getDeviceNetworkInfo: () => ipcRenderer.invoke('get-device-network-info'),
  connectToServer: (ip: string, port: number) => ipcRenderer.invoke('connect-to-server', ip, port),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

  // 🖨️ Printing
  getLocalPrinters: () => ipcRenderer.invoke('get-local-printers'),
  printTicket: (ticketData: any, printerName?: string) => ipcRenderer.invoke('print-ticket', ticketData, printerName),
  generatePDF: (ticketData: any, outputPath?: string) => ipcRenderer.invoke('generate-pdf', ticketData, outputPath),
  smartPrintTicket: (ticketData: any, preferences?: any) => ipcRenderer.invoke('smart-print-ticket', ticketData, preferences),

  // 🔊 Audio
  audioPlayAnnouncement: (ticketNumber: string, windowLabel: string) =>
    ipcRenderer.invoke('audio:play-announcement', ticketNumber, windowLabel),
  audioSetEnabled: (enabled: boolean) => ipcRenderer.invoke('audio:set-enabled', enabled),
  audioIsEnabled: () => ipcRenderer.invoke('audio:is-enabled'),
  audioTest: () => ipcRenderer.invoke('audio:test'),

  // 📺 Video Player - فيديو بسيط مكتوم في حلقة
  videoPlay: (filePath?: string) => ipcRenderer.invoke('video:play', filePath || 'sample-ad.mp4'),
  videoLoop: (filePath?: string) => ipcRenderer.invoke('video:loop', filePath || 'sample-ad.mp4'),
  videoTest: () => ipcRenderer.invoke('video:test'),

  // 📁 Resources
  getLogoPath: () => ipcRenderer.invoke('get-logo-path'),

  // 🎫 Tickets API
  createTicket: (serviceId: number) => ipcRenderer.invoke('api:create-ticket', serviceId),
  getTickets: () => ipcRenderer.invoke('api:get-tickets'),
  getTicketById: (ticketId: number) => ipcRenderer.invoke('api:get-ticket-by-id', ticketId),
  callTicket: (ticketId: number, windowId: string) => ipcRenderer.invoke('api:call-ticket', ticketId, windowId),
  serveTicket: (ticketId: number, windowId?: string) => ipcRenderer.invoke('api:serve-ticket', ticketId, windowId),
  updateTicketStatus: (ticketId: number, status: string, windowId?: string) =>
    ipcRenderer.invoke('api:update-ticket-status', ticketId, status, windowId),
  deleteTicket: (ticketId: number) => ipcRenderer.invoke('api:delete-ticket', ticketId),
  getPendingTickets: () => ipcRenderer.invoke('api:get-pending-tickets'),
  getTicketsByService: (serviceId: number) => ipcRenderer.invoke('api:get-tickets-by-service', serviceId),
  getTicketStatistics: () => ipcRenderer.invoke('api:get-ticket-statistics'),
  getQueueStatus: () => ipcRenderer.invoke('api:get-queue-status'),
  getRecentTickets: (limit?: number) => ipcRenderer.invoke('api:get-recent-tickets', limit),
  callNextTicket: (windowId: number) => ipcRenderer.invoke('api:call-next-ticket', windowId),
  updatePrintStatus: (ticketId: number, printStatus: string, errorMessage?: string) =>
    ipcRenderer.invoke('api:update-print-status', ticketId, printStatus, errorMessage),

  // 🏢 Services API
  getServices: () => ipcRenderer.invoke('api:get-services'),
  getServiceById: (serviceId: number) => ipcRenderer.invoke('api:get-service-by-id', serviceId),
  createService: (name: string) => ipcRenderer.invoke('api:create-service', name),
  updateService: (serviceId: number, name: string) => ipcRenderer.invoke('api:update-service', serviceId, name),
  deleteService: (serviceId: number) => ipcRenderer.invoke('api:delete-service', serviceId),

  // 🪟 Windows API
  getWindows: () => ipcRenderer.invoke('api:get-windows'),
  getWindowById: (windowId: number) => ipcRenderer.invoke('api:get-window-by-id', windowId),
  createWindow: (active?: boolean) => ipcRenderer.invoke('api:create-window', active),
  updateWindow: (windowId: number, active?: boolean) => ipcRenderer.invoke('api:update-window', windowId, active),
  deleteWindow: (windowId: number) => ipcRenderer.invoke('api:delete-window', windowId),
  getActiveWindows: () => ipcRenderer.invoke('api:get-active-windows'),
  createWindowWithAutoNumber: () => ipcRenderer.invoke('api:create-window-auto'),

  // 👥 Employees API
  getEmployees: () => ipcRenderer.invoke('api:get-employees'),
  getActiveEmployees: () => ipcRenderer.invoke('api:get-active-employees'),
  getEmployeeByWindow: (windowNumber: string) => ipcRenderer.invoke('api:get-employee-by-window', windowNumber),
  createEmployeeWindow: (windowNumber: string, deviceId?: string, serviceId?: number) =>
    ipcRenderer.invoke('api:create-employee-window', windowNumber, deviceId, serviceId),
  assignServiceToEmployee: (windowNumber: string, serviceId: number) =>
    ipcRenderer.invoke('api:assign-service-to-employee', windowNumber, serviceId),
  removeServiceFromEmployee: (windowNumber: string) =>
    ipcRenderer.invoke('api:remove-service-from-employee', windowNumber),
  getNextWindowNumber: () => ipcRenderer.invoke('api:get-next-window-number'),
  initializeEmployeeSession: (data: any) => ipcRenderer.invoke('api:initialize-employee-session', data),

  // 🖥️ Devices API
  getDevices: () => ipcRenderer.invoke('api:get-devices'),
  getDeviceById: (deviceId: number) => ipcRenderer.invoke('api:get-device-by-id', deviceId),
  getDeviceByDeviceId: (deviceId: string) => ipcRenderer.invoke('api:get-device-by-device-id', deviceId),
  registerDevice: (deviceInfo: any) => ipcRenderer.invoke('api:register-device', deviceInfo),
  updateDevice: (deviceId: number, deviceInfo: any) => ipcRenderer.invoke('api:update-device', deviceId, deviceInfo),
  updateDeviceStatus: (deviceId: string, status: string) => ipcRenderer.invoke('api:update-device-status', deviceId, status),
  deleteDevice: (deviceId: number) => ipcRenderer.invoke('api:delete-device', deviceId),
  getOnlineDevices: () => ipcRenderer.invoke('api:get-online-devices'),
  getDevicesByType: (type: string) => ipcRenderer.invoke('api:get-devices-by-type', type),

  // 🔌 Socket Connection Management
  connectSocket: (serverUrl: string, deviceInfo?: any) => ipcRenderer.invoke('socket:connect', serverUrl, deviceInfo),
  disconnectSocket: () => ipcRenderer.invoke('socket:disconnect'),
  isSocketConnected: () => ipcRenderer.invoke('socket:is-connected'),
  registerSocketDevice: (deviceInfo: any) => ipcRenderer.invoke('socket:register-device', deviceInfo),
  socketEmit: (event: string, data?: any) => ipcRenderer.invoke('socket:emit', event, data),
  enableAutoReconnect: (enabled: boolean) => ipcRenderer.invoke('socket:auto-reconnect', enabled),

  // 🔔 Socket Event Listeners (للاستماع للأحداث)
  onSocketEvent: (event: string, callback: Function) => {
    const channel = `socket:event:${event}`;
    ipcRenderer.on(channel, (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners(channel);
  },
  offSocketEvent: (event: string) => ipcRenderer.removeAllListeners(`socket:event:${event}`),

  // 🎯 Real-time Methods (طرق التحديث المباشر)
  callTicketRealtime: (ticketId: number, windowNumber: string) =>
    ipcRenderer.invoke('realtime:call-ticket', ticketId, windowNumber),
  serveTicketRealtime: (ticketId: number, windowNumber: string) =>
    ipcRenderer.invoke('realtime:serve-ticket', ticketId, windowNumber),
  createTicketRealtime: (serviceId: number) => ipcRenderer.invoke('realtime:create-ticket', serviceId),
  getRealtimeQueueStatus: () => ipcRenderer.invoke('realtime:get-queue-status'),
  getRealtimeTicketsByService: (serviceId: number) => ipcRenderer.invoke('realtime:get-tickets-by-service', serviceId),

  // 🔧 System Management
  resetSystem: () => ipcRenderer.invoke('system:reset'),
  getSystemHealth: () => ipcRenderer.invoke('system:health'),
  getNetworkInfo: () => ipcRenderer.invoke('system:network-info'),
  requestNotificationPermission: () => ipcRenderer.invoke('system:notification-permission'),

  // 🎫 Legacy - Ticket creation (للتوافق مع الإصدارات السابقة)
  createRealTicket: (serviceId: number, printerId: string) =>
    ipcRenderer.invoke('create-real-ticket', serviceId, printerId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
