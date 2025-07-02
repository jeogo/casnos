import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
// logger removed
import {
  Service,
  Ticket,
  DatabaseService,
  DatabaseTicket,
  Window,
  DatabaseWindow,
  Employee,
  DatabaseEmployee,
  Device,
  DevicePrinter,
  DatabaseDevice,
  DatabaseDevicePrinter
} from '../types'

const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'queue.db')

let db: Database.Database

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true })
}

export function initializeDatabase(): void {
  try {
    db = new Database(DB_PATH)

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = 1000')
    db.pragma('temp_store = memory')

    createTables()
    seedDefaultServices()
  } catch (error) {
    throw error
  }
}

function createTables(): void {
  try {


    // Only create tables if they don't exist (no dropping)
    // This preserves data between server restarts

  // Create services table
  const createServicesTable = `
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `

  // Create devices table
  const createDevicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      port INTEGER,
      device_type TEXT NOT NULL CHECK (device_type IN ('display', 'customer', 'employee')),
      status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
      last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      capabilities TEXT, -- JSON string
      metadata TEXT -- JSON string
    )
  `

  // Create device_printers table (only required fields)
  const createDevicePrintersTable = `
    CREATE TABLE IF NOT EXISTS device_printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      printer_id TEXT NOT NULL,
      printer_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE,
      UNIQUE(device_id, printer_id)
    )
  `
  // Create tickets table with global numbering and print status
  const createTicketsTable = `
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      service_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'served')),
      print_status TEXT DEFAULT 'pending' CHECK (print_status IN ('pending', 'printing', 'printed', 'print_failed')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      called_at TEXT,
      window_label TEXT,
      printer_id TEXT,
      target_device TEXT,
      FOREIGN KEY(service_id) REFERENCES services(id)
    )
  `

  // Create windows table
  const createWindowsTable = `
    CREATE TABLE IF NOT EXISTS windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      active BOOLEAN DEFAULT 1
    )
  `

  // Create window_services junction table
  const createWindowServicesTable = `
    CREATE TABLE IF NOT EXISTS window_services (
      window_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (window_id, service_id),
      FOREIGN KEY (window_id) REFERENCES windows(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `

  // Create employees table (شباك)
  const createEmployeesTable = `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      window_number TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL UNIQUE,
      service_id INTEGER NULL,
      service_name TEXT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    )
  `

  // Create daily resets table for tracking daily resets
  const createDailyResetsTable = `
    CREATE TABLE IF NOT EXISTS daily_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_reset_date TEXT NOT NULL UNIQUE,
      last_reset_timestamp TEXT NOT NULL,
      tickets_reset INTEGER DEFAULT 0,
      pdfs_reset INTEGER DEFAULT 0,
      cache_reset INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Create indexes for better performance
  const createIndexes = [
    // Existing indexes
    'CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_windows_active ON windows(active)',
    'CREATE INDEX IF NOT EXISTS idx_window_services_window ON window_services(window_id)',
    'CREATE INDEX IF NOT EXISTS idx_window_services_service ON window_services(service_id)',

    // New device indexes
    'CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)',
    'CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type)',
    'CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_unique_id ON devices(device_id)',

    // New device_printers indexes
    'CREATE INDEX IF NOT EXISTS idx_device_printers_device_id ON device_printers(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_device_printers_printer_id ON device_printers(printer_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_device_printers_unique ON device_printers(device_id, printer_id)',

    // New employees indexes
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_window_number ON employees(window_number)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_device_id ON employees(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_employees_service_id ON employees(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active)',

    // Daily resets indexes
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_resets_date ON daily_resets(last_reset_date)',
    'CREATE INDEX IF NOT EXISTS idx_daily_resets_timestamp ON daily_resets(last_reset_timestamp)'
  ]

  db.exec(createServicesTable)
  db.exec(createDevicesTable)
  db.exec(createDevicePrintersTable)
  db.exec(createTicketsTable)
  db.exec(createWindowsTable)
  db.exec(createWindowServicesTable)
  db.exec(createEmployeesTable)
  db.exec(createDailyResetsTable)

  // Handle migration for existing employees table (add device_id column if it doesn't exist)
  try {
    // Check if device_id column exists
    const tableInfo = db.prepare("PRAGMA table_info(employees)").all() as any[]
    const hasDeviceId = tableInfo.some(column => column.name === 'device_id')

    if (!hasDeviceId) {
      // Migrating employees table to add device_id column

      // Add device_id column
      db.exec('ALTER TABLE employees ADD COLUMN device_id TEXT')

      // For existing employees, generate unique device IDs based on window_number
      const existingEmployees = db.prepare('SELECT id, window_number FROM employees WHERE device_id IS NULL').all() as any[]

      for (const emp of existingEmployees) {
        const deviceId = `employee-window-${emp.window_number}-${Date.now()}`
        db.prepare('UPDATE employees SET device_id = ? WHERE id = ?').run(deviceId, emp.id)
      }

      // Create unique constraint for device_id (since we can't modify the original CREATE TABLE)
      try {
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_device_id_unique ON employees(device_id)')
      } catch (indexError) {
      }

      // Migration completed for existing employees
    }
  } catch (migrationError) {
  }

  createIndexes.forEach(index => db.exec(index))

  } catch (error) {

    throw error
  }
}

function seedDefaultServices(): void {
  try {
    // No default data - keep database clean
  } catch (error) {

  }
}

// Service operations
export const serviceOperations = {
  getAll: (): Service[] => {
    const stmt = db.prepare('SELECT * FROM services ORDER BY name')
    return stmt.all() as Service[]
  },

  getById: (id: number): Service | undefined => {
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?')
    return stmt.get(id) as Service | undefined
  },

  create: (service: DatabaseService): Service => {
    const stmt = db.prepare('INSERT INTO services (name) VALUES (?) RETURNING *')
    return stmt.get(service.name) as Service
  },

  update: (id: number, service: Partial<DatabaseService>): Service | undefined => {
    const stmt = db.prepare('UPDATE services SET name = ? WHERE id = ? RETURNING *')
    return stmt.get(service.name, id) as Service | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM services WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Ticket operations with global numbering
export const ticketOperations = {
  getAll: (): Ticket[] => {
    const stmt = db.prepare(`
      SELECT * FROM tickets
      ORDER BY created_at DESC
    `)
    return stmt.all() as Ticket[]
  },

  getById: (id: number): Ticket | undefined => {
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?')
    return stmt.get(id) as Ticket | undefined
  },

  getByServiceId: (serviceId: number): Ticket[] => {
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE service_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(serviceId) as Ticket[]
  },

  getPendingTickets: (): Ticket[] => {
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `)
    return stmt.all() as Ticket[]
  },

  getNextGlobalNumber: (): number => {
    const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets')
    const result = stmt.get() as { next_number: number }
    return result.next_number
  },  create: (ticket: DatabaseTicket): Ticket => {
    // توليد رقم التذكرة التلقائي - يبدأ من 1
    const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets')
    const result = stmt.get() as { next_number: number }
    const nextNumber = result.next_number
    const ticketNumber = nextNumber.toString() // رقم بسيط يبدأ من 1

    const insertStmt = db.prepare(`
      INSERT INTO tickets (ticket_number, service_id, service_name, status, print_status, printer_id, target_device)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    return insertStmt.get(
      ticketNumber,
      ticket.service_id,
      ticket.service_name,
      ticket.status || 'pending',
      ticket.print_status || 'pending',
      ticket.printer_id || null,
      ticket.target_device || null
    ) as Ticket
  },
    updateStatus: (id: number, status: Ticket['status'], windowLabel?: string): Ticket | undefined => {
    const calledAt = status === 'called' ? new Date().toISOString() : null

    if (windowLabel !== undefined) {
      // Update with window label (when calling a ticket)
      const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = ?, window_label = ?
        WHERE id = ?
        RETURNING *
      `)
      return stmt.get(status, calledAt, windowLabel, id) as Ticket | undefined
    } else {
      // Update only status and called_at (preserve existing window_label)
      const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = ?
        WHERE id = ?
        RETURNING *
      `)
      return stmt.get(status, calledAt, id) as Ticket | undefined
    }
  },

  updatePrintStatus: (id: number, printStatus: 'pending' | 'printing' | 'printed' | 'print_failed'): Ticket | undefined => {
    const stmt = db.prepare(`
      UPDATE tickets
      SET print_status = ?
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(printStatus, id) as Ticket | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM tickets WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Window operations
export const windowOperations = {
  getAll: (): Window[] => {
    const stmt = db.prepare('SELECT * FROM windows ORDER BY label')
    return stmt.all() as Window[]
  },

  getById: (id: number): Window | undefined => {
    const stmt = db.prepare('SELECT * FROM windows WHERE id = ?')
    return stmt.get(id) as Window | undefined
  },

  getActiveWindows: (): Window[] => {
    const stmt = db.prepare('SELECT * FROM windows WHERE active = 1 ORDER BY label')
    return stmt.all() as Window[]
  },
    create: (windowData: DatabaseWindow): Window => {
    const stmt = db.prepare('INSERT INTO windows (label, active) VALUES (?, ?) RETURNING *')
    const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1
    return stmt.get(windowData.label, activeValue) as Window
  },

  update: (id: number, windowData: Partial<DatabaseWindow>): Window | undefined => {
    const stmt = db.prepare('UPDATE windows SET label = ?, active = ? WHERE id = ? RETURNING *')
    const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1
    return stmt.get(windowData.label, activeValue, id) as Window | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM windows WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  getWindowServices: (windowId: number): Service[] => {
    const stmt = db.prepare(`
      SELECT s.* FROM services s
      INNER JOIN window_services ws ON s.id = ws.service_id
      WHERE ws.window_id = ?
    `)
    return stmt.all(windowId) as Service[]
  },

  assignServices: (windowId: number, serviceIds: number[]): void => {
    // Remove existing assignments
    const deleteStmt = db.prepare('DELETE FROM window_services WHERE window_id = ?')
    deleteStmt.run(windowId)

    // Add new assignments
    const insertStmt = db.prepare('INSERT INTO window_services (window_id, service_id) VALUES (?, ?)')
    serviceIds.forEach(serviceId => {
      insertStmt.run(windowId, serviceId)
    })
  }
}

// Device operations
export const deviceOperations = {
  getAll: (): Device[] => {
    const stmt = db.prepare('SELECT * FROM devices ORDER BY name')
    return stmt.all() as Device[]
  },

  getById: (id: number): Device | undefined => {
    const stmt = db.prepare('SELECT * FROM devices WHERE id = ?')
    return stmt.get(id) as Device | undefined
  },

  getByDeviceId: (deviceId: string): Device | undefined => {
    const stmt = db.prepare('SELECT * FROM devices WHERE device_id = ?')
    return stmt.get(deviceId) as Device | undefined
  },

  getOnlineDevices: (): Device[] => {
    try {
      const stmt = db.prepare('SELECT * FROM devices WHERE status = ? ORDER BY name')
      const result = stmt.all('online') as Device[]
      return result
    } catch (error) {

      throw error
    }
  },

  getByType: (deviceType: string): Device[] => {
    const stmt = db.prepare('SELECT * FROM devices WHERE device_type = ? ORDER BY name')
    return stmt.all(deviceType) as Device[]
  },

  create: (device: DatabaseDevice): Device => {
    const stmt = db.prepare(`
      INSERT INTO devices (device_id, name, ip_address, port, device_type, status, capabilities, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    return stmt.get(
      device.device_id,
      device.name,
      device.ip_address,
      device.port || null,
      device.device_type,
      device.status || 'offline',
      device.capabilities || null,
      device.metadata || null
    ) as Device
  },

  update: (id: number, device: Partial<DatabaseDevice>): Device | undefined => {
    const fields: string[] = []
    const values: any[] = []

    if (device.name !== undefined) {
      fields.push('name = ?')
      values.push(device.name)
    }
    if (device.ip_address !== undefined) {
      fields.push('ip_address = ?')
      values.push(device.ip_address)
    }
    if (device.port !== undefined) {
      fields.push('port = ?')
      values.push(device.port)
    }
    if (device.device_type !== undefined) {
      fields.push('device_type = ?')
      values.push(device.device_type)
    }
    if (device.status !== undefined) {
      fields.push('status = ?')
      values.push(device.status)
    }
    if (device.capabilities !== undefined) {
      fields.push('capabilities = ?')
      values.push(device.capabilities)
    }
    if (device.metadata !== undefined) {
      fields.push('metadata = ?')
      values.push(device.metadata)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
    return stmt.get(...values) as Device | undefined
  },

  updateStatus: (deviceId: string, status: 'online' | 'offline' | 'error'): Device | undefined => {
    const stmt = db.prepare(`
      UPDATE devices
      SET status = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(status, deviceId) as Device | undefined
  },

  updateLastSeen: (deviceId: string): Device | undefined => {
    const stmt = db.prepare(`
      UPDATE devices
      SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(deviceId) as Device | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM devices WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  deleteByDeviceId: (deviceId: string): boolean => {
    const stmt = db.prepare('DELETE FROM devices WHERE device_id = ?')
    const result = stmt.run(deviceId)
    return result.changes > 0
  }
}

// Device Printer operations
export const devicePrinterOperations = {
  getAll: (): DevicePrinter[] => {
    const stmt = db.prepare(`
      SELECT * FROM device_printers ORDER BY printer_name
    `)
    return stmt.all() as DevicePrinter[]
  },

  getById: (id: number): DevicePrinter | undefined => {
    const stmt = db.prepare('SELECT * FROM device_printers WHERE id = ?')
    return stmt.get(id) as DevicePrinter | undefined
  },

  getByDeviceId: (deviceId: number): DevicePrinter[] => {
    const stmt = db.prepare('SELECT * FROM device_printers WHERE device_id = ? ORDER BY printer_name')
    return stmt.all(deviceId) as DevicePrinter[]
  },

  getByPrinterId: (printerId: string): DevicePrinter | undefined => {
    const stmt = db.prepare('SELECT * FROM device_printers WHERE printer_id = ?')
    return stmt.get(printerId) as DevicePrinter | undefined
  },

  create: (printer: { device_id: number, printer_id: string, printer_name: string }): DevicePrinter => {
    const stmt = db.prepare(`
      INSERT INTO device_printers (device_id, printer_id, printer_name)
      VALUES (?, ?, ?)
      RETURNING *
    `)
    return stmt.get(printer.device_id, printer.printer_id, printer.printer_name) as DevicePrinter
  },

  update: (id: number, printer: { printer_name?: string }): DevicePrinter | undefined => {
    const fields: string[] = []
    const values: any[] = []

    if (printer.printer_name !== undefined) {
      fields.push('printer_name = ?')
      values.push(printer.printer_name)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE device_printers SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
    return stmt.get(...values) as DevicePrinter | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM device_printers WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  deleteByPrinterId: (printerId: string): boolean => {
    const stmt = db.prepare('DELETE FROM device_printers WHERE printer_id = ?')
    const result = stmt.run(printerId)
    return result.changes > 0
  }
}

// Employee operations (شباك)
export const employeeOperations = {
  getAll: (): Employee[] => {
    const stmt = db.prepare('SELECT * FROM employees ORDER BY window_number')
    return stmt.all() as Employee[]
  },

  getById: (id: number): Employee | undefined => {
    const stmt = db.prepare('SELECT * FROM employees WHERE id = ?')
    return stmt.get(id) as Employee | undefined
  },

  getByWindowNumber: (windowNumber: string): Employee | undefined => {
    const stmt = db.prepare('SELECT * FROM employees WHERE window_number = ?')
    return stmt.get(windowNumber) as Employee | undefined
  },

  getByDeviceId: (deviceId: string): Employee | undefined => {
    const stmt = db.prepare('SELECT * FROM employees WHERE device_id = ?')
    return stmt.get(deviceId) as Employee | undefined
  },

  getActiveEmployees: (): Employee[] => {
    const stmt = db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY window_number')
    return stmt.all() as Employee[]
  },

  getNextWindowNumber: (): string => {
    const stmt = db.prepare('SELECT window_number FROM employees ORDER BY CAST(window_number AS INTEGER) DESC LIMIT 1')
    const result = stmt.get() as { window_number: string } | undefined

    if (!result) {
      return '1'
    }

    const lastNumber = parseInt(result.window_number)
    return (lastNumber + 1).toString()
  },

  create: (employee: DatabaseEmployee): Employee => {
    const stmt = db.prepare(`
      INSERT INTO employees (window_number, device_id, service_id, service_name, is_active)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `)
    return stmt.get(
      employee.window_number,
      employee.device_id || `legacy-${employee.window_number}-${Date.now()}`,
      employee.service_id || null,
      employee.service_name || null,
      employee.is_active !== undefined ? (employee.is_active ? 1 : 0) : 1
    ) as Employee
  },

  update: (id: number, employee: Partial<DatabaseEmployee>): Employee | undefined => {
    const fields: string[] = []
    const values: any[] = []

    if (employee.window_number !== undefined) {
      fields.push('window_number = ?')
      values.push(employee.window_number)
    }
    if (employee.service_id !== undefined) {
      fields.push('service_id = ?')
      values.push(employee.service_id)
    }
    if (employee.service_name !== undefined) {
      fields.push('service_name = ?')
      values.push(employee.service_name)
    }
    if (employee.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(employee.is_active ? 1 : 0)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
    return stmt.get(...values) as Employee | undefined
  },

  updateByWindowNumber: (windowNumber: string, employee: Partial<DatabaseEmployee>): Employee | undefined => {
    const fields: string[] = []
    const values: any[] = []

    if (employee.service_id !== undefined) {
      fields.push('service_id = ?')
      values.push(employee.service_id)
    }
    if (employee.service_name !== undefined) {
      fields.push('service_name = ?')
      values.push(employee.service_name)
    }
    if (employee.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(employee.is_active ? 1 : 0)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(windowNumber)

    const stmt = db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE window_number = ? RETURNING *`)
    return stmt.get(...values) as Employee | undefined
  },

  assignService: (windowNumber: string, serviceId: number, serviceName: string): Employee | undefined => {
    const stmt = db.prepare(`
      UPDATE employees
      SET service_id = ?, service_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE window_number = ?
      RETURNING *
    `)
    return stmt.get(serviceId, serviceName, windowNumber) as Employee | undefined
  },

  removeService: (windowNumber: string): Employee | undefined => {
    const stmt = db.prepare(`
      UPDATE employees
      SET service_id = NULL, service_name = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE window_number = ?
      RETURNING *
    `)
    return stmt.get(windowNumber) as Employee | undefined
  },

  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM employees WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  deleteByWindowNumber: (windowNumber: string): boolean => {
    const stmt = db.prepare('DELETE FROM employees WHERE window_number = ?')
    const result = stmt.run(windowNumber)
    return result.changes > 0
  }
}

export function getDatabase(): Database.Database {
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()

  }
}
