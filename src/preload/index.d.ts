import { ElectronAPI } from '@electron-toolkit/preload'

// Basic interfaces for ticket and print data
export interface TicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  printer?: string;
  pdfPath?: string | null;
  path?: string;
}

// Simplified API interface with complete functionality
export interface CASNOSApi {
  // 🌐 Network & Discovery
  discoverServerUdp: () => Promise<{ ip: string; port: number } | null>
  getServerInfo: () => Promise<{ ip: string; port: number } | null>
  updateServerInfo: (serverInfo: { ip: string; port: number }) => Promise<{ success: boolean }>
  getDeviceNetworkInfo: () => Promise<{ ipAddress: string; timestamp: string }>
  connectToServer: (ip: string, port: number) => Promise<{ success: boolean; connected: boolean; server?: { ip: string; port: number }; error?: string }>
  getServerStatus: () => Promise<{ success: boolean; status: string; health?: any; error?: string }>
  getConnectionStatus: () => Promise<{ success: boolean; connected: boolean; server: { ip: string | null; port: number } }>

  // 🖨️ Printing functionality
  getLocalPrinters: () => Promise<any[]>;
  printTicket: (ticketData: TicketData, printerName?: string) => Promise<PrintResult>;
  generatePDF: (ticketData: TicketData, outputPath?: string) => Promise<PrintResult>;
  smartPrintTicket: (ticketData: TicketData, preferences?: any) => Promise<PrintResult>;

  // 🔊 Audio functionality
  audioPlayAnnouncement: (ticketNumber: string, windowLabel: string) => Promise<{ success: boolean; message: string }>;
  audioSetEnabled: (enabled: boolean) => Promise<{ success: boolean; message: string }>;
  audioIsEnabled: () => Promise<{ success: boolean; enabled: boolean }>
  audioTest: () => Promise<{ success: boolean; message: string }>

  // 📁 Resources
  getLogoPath: () => Promise<string | null>;

  // 🎫 Tickets API
  createTicket: (serviceId: number) => Promise<any>
  getTickets: () => Promise<any>
  getTicketById: (ticketId: number) => Promise<any>
  callTicket: (ticketId: number, windowId: string) => Promise<any>
  serveTicket: (ticketId: number, windowId?: string) => Promise<any>
  updateTicketStatus: (ticketId: number, status: string, windowId?: string) => Promise<any>
  deleteTicket: (ticketId: number) => Promise<any>
  getPendingTickets: () => Promise<any>
  getTicketsByService: (serviceId: number) => Promise<any>
  getTicketStatistics: () => Promise<any>
  getQueueStatus: () => Promise<any>
  getRecentTickets: (limit?: number) => Promise<any>
  callNextTicket: (windowId: number) => Promise<any>
  updatePrintStatus: (ticketId: number, printStatus: string, errorMessage?: string) => Promise<any>

  // 🏢 Services API
  getServices: () => Promise<any>
  getServiceById: (serviceId: number) => Promise<any>
  createService: (name: string) => Promise<any>
  updateService: (serviceId: number, name: string) => Promise<any>
  deleteService: (serviceId: number) => Promise<any>

  // 🪟 Windows API
  getWindows: () => Promise<any>
  getWindowById: (windowId: number) => Promise<any>
  createWindow: (active?: boolean) => Promise<any>
  updateWindow: (windowId: number, active?: boolean) => Promise<any>
  deleteWindow: (windowId: number) => Promise<any>
  getActiveWindows: () => Promise<any>
  createWindowWithAutoNumber: () => Promise<any>

  // 👥 Employees API
  getEmployees: () => Promise<any>
  getActiveEmployees: () => Promise<any>
  getEmployeeByWindow: (windowNumber: string) => Promise<any>
  createEmployeeWindow: (windowNumber: string, deviceId?: string, serviceId?: number) => Promise<any>
  assignServiceToEmployee: (windowNumber: string, serviceId: number) => Promise<any>
  removeServiceFromEmployee: (windowNumber: string) => Promise<any>
  getNextWindowNumber: () => Promise<any>
  initializeEmployeeSession: (data: any) => Promise<any>

  // 🖥️ Devices API
  getDevices: () => Promise<any>
  getDeviceById: (deviceId: number) => Promise<any>
  getDeviceByDeviceId: (deviceId: string) => Promise<any>
  registerDevice: (deviceInfo: any) => Promise<any>
  updateDevice: (deviceId: number, deviceInfo: any) => Promise<any>
  updateDeviceStatus: (deviceId: string, status: string) => Promise<any>
  deleteDevice: (deviceId: number) => Promise<any>
  getOnlineDevices: () => Promise<any>
  getDevicesByType: (type: string) => Promise<any>

  // 🔌 Socket Connection Management
  connectSocket: (serverUrl: string, deviceInfo?: any) => Promise<{ success: boolean; connected: boolean }>
  disconnectSocket: () => Promise<{ success: boolean; connected: boolean }>
  isSocketConnected: () => Promise<{ success: boolean; connected: boolean; socketId?: string | null }>
  registerSocketDevice: (deviceInfo: any) => Promise<{ success: boolean; registered: boolean; error?: string }>
  socketEmit: (event: string, data?: any) => Promise<{ success: boolean; emitted: boolean; error?: string }>
  enableAutoReconnect: (enabled: boolean) => Promise<{ success: boolean; autoReconnect: boolean }>

  // 🔔 Socket Event Listeners
  onSocketEvent: (event: string, callback: Function) => () => void
  offSocketEvent: (event: string) => void

  // 🎯 Real-time Methods
  callTicketRealtime: (ticketId: number, windowNumber: string) => Promise<any>
  serveTicketRealtime: (ticketId: number, windowNumber: string) => Promise<any>
  createTicketRealtime: (serviceId: number) => Promise<any>
  getRealtimeQueueStatus: () => Promise<any>
  getRealtimeTicketsByService: (serviceId: number) => Promise<any>

  // 🔧 System Management
  resetSystem: () => Promise<any>
  getSystemHealth: () => Promise<any>
  getNetworkInfo: () => Promise<any>
  requestNotificationPermission: () => Promise<{ success: boolean; permission: string }>

  // 🎫 Legacy - Ticket creation
  createRealTicket: (serviceId: number, printerId: string) => Promise<{ success: boolean; ticket?: any; error?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: CASNOSApi;
  }
}
