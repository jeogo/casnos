import { ElectronAPI } from '@electron-toolkit/preload'

export interface TicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
  printer_id?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  printer?: string;
  pdfPath?: string | null;
  path?: string;
}

export interface CASNOSApi {
  ping: () => Promise<string>;
  listenUdp: (port: number) => Promise<any>;
  connectSocket: (serverUrl: string, options?: any) => Promise<any>;
  getSocketServerIp: () => Promise<string | null>;
  getLocalPrinters: () => Promise<any[]>;
  getServerInfo: () => Promise<{ ip: string; port?: number } | null>;
  // Logo and resources
  getLogoPath: () => Promise<string | null>;
  // Ticket creation
  createRealTicket: (serviceId: number, printerId: string) => Promise<{ success: boolean; ticket?: any; error?: string }>;
  // Print-related methods
  printTicket: (ticketData: TicketData, printerName?: string) => Promise<PrintResult>;
  generatePDF: (ticketData: TicketData, outputPath?: string) => Promise<PrintResult>;
  getAllPrinters: () => Promise<any[]>;
  testPrinter: (printerName?: string) => Promise<PrintResult>;
  smartPrintTicket: (ticketData: TicketData, preferences?: any) => Promise<PrintResult>;
  // Smart Print System
  smartCreateAndPrintTicket: (ticketData: any) => Promise<any>;
  testSmartPrintSystem: () => Promise<any>;
  // Test and validation methods
  testTicketGeneration: () => Promise<{ success: boolean; message: string }>;
  validateTicketData: (ticketData: TicketData) => Promise<{ success: boolean; valid: boolean; message: string }>;
  // PDF Storage management
  getPDFStorageInfo: () => Promise<{ success: boolean; baseDirectory: string; statistics: any; message: string }>
  findTicketFiles: (ticketNumber: string) => Promise<{ success: boolean; files: string[]; count: number; message: string }>
  cleanupOldPDFFiles: (hoursToKeep?: number) => Promise<{ success: boolean; message: string }>
  openPDFStorageFolder: () => Promise<{ success: boolean; path: string; message: string }>
  // Audio System
  audioPlayAnnouncement: (ticketNumber: string, windowLabel: string) => Promise<{ success: boolean; message: string }>
  audioTest: () => Promise<{ success: boolean; message: string }>
  audioSetEnabled: (enabled: boolean) => Promise<{ success: boolean; message: string }>
  // Update server info in main process
  updateServerInfo: (serverInfo: { ip: string; port: number }) => Promise<{ success: boolean; message?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CASNOSApi
  }
}
