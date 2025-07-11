// Database Operations - Main Index
// Centralized exports for all database operations

export { serviceOperations } from './services'
export { ticketOperations } from './tickets'
export { windowOperations } from './windows'

// Legacy exports (to be refactored)
export { deviceOperations, devicePrinterOperations } from './device.operations'
export { systemOperations } from './system.operations'

// Re-export connection functions
export { initializeConnection as initializeDatabase, getDatabase, closeConnection as closeDatabase } from '../connection'

// Re-export types for convenience
export type {
  Service,
  Ticket,
  Window,
  Device,
  DevicePrinter,
  DatabaseService,
  DatabaseTicket,
  DatabaseWindow,
  DatabaseDevice,
  DatabaseDevicePrinter
} from '../../types'
