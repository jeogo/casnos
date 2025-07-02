import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Simple API - no server functionality needed
const api = {
  // Simple ping function
  ping: (): Promise<string> => Promise.resolve('pong'),
  listenUdp: (port: number) => ipcRenderer.invoke('listen-udp', port),
  discoverServerUdp: () => ipcRenderer.invoke('discover-server-udp'),
  connectSocket: (serverUrl: string, options?: any) => ipcRenderer.invoke('connect-socket', serverUrl, options),
  getSocketServerIp: () => ipcRenderer.invoke('get-socket-server-ip'),
  getLocalPrinters: () => ipcRenderer.invoke('get-local-printers'),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  // Network and device info
  getMacAddress: () => ipcRenderer.invoke('get-mac-address'),
  getDeviceNetworkInfo: () => ipcRenderer.invoke('get-device-network-info'),
  // Logo and resources
  getLogoPath: () => ipcRenderer.invoke('get-logo-path'),
  // Ticket creation
  createRealTicket: (serviceId: number, printerId: string) => ipcRenderer.invoke('create-real-ticket', serviceId, printerId),
  // Print-related methods
  printTicket: (ticketData: any, printerName?: string) => ipcRenderer.invoke('print-ticket', ticketData, printerName),
  generatePDF: (ticketData: any, outputPath?: string) => ipcRenderer.invoke('generate-pdf', ticketData, outputPath),
  getAllPrinters: () => ipcRenderer.invoke('get-all-printers'),
  testPrinter: (printerName?: string) => ipcRenderer.invoke('test-printer', printerName),
  smartPrintTicket: (ticketData: any, preferences?: any) => ipcRenderer.invoke('smart-print-ticket', ticketData, preferences),
  // PDF Storage management
  getPDFStorageInfo: (): Promise<{ success: boolean; baseDirectory: string; statistics: any; message: string }> =>
    ipcRenderer.invoke('get-pdf-storage-info'),

  findTicketFiles: (ticketNumber: string): Promise<{ success: boolean; files: string[]; count: number; message: string }> =>
    ipcRenderer.invoke('find-ticket-files', ticketNumber),

  cleanupOldPDFFiles: (hoursToKeep?: number): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('cleanup-old-pdf-files', hoursToKeep),

  openPDFStorageFolder: (): Promise<{ success: boolean; path: string; message: string }> =>
    ipcRenderer.invoke('open-pdf-storage-folder'),

  // Smart Print System
  smartCreateAndPrintTicket: (ticketData: any) => ipcRenderer.invoke('smart-create-and-print-ticket', ticketData),

  // SumatraPDF Testing
  testSumatraPDF: () => ipcRenderer.invoke('test-sumatra-pdf'),
  getSumatraPDFDiagnostics: () => ipcRenderer.invoke('get-sumatra-pdf-diagnostics'),
  testSmartPrintSystem: () => ipcRenderer.invoke('test-smart-print-system'),
  // Update server info in main process
  updateServerInfo: (serverInfo: { ip: string; port: number }) => ipcRenderer.invoke('update-server-info', serverInfo),
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
