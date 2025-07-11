import { getDatabase } from '../connection'

export function createServiceSchema(): void {
  const db = getDatabase()

  const createServicesTable = `
    CREATE TABLE  IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `

  const createServiceIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)',
    'CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at)'
  ]

  db.exec(createServicesTable)
  createServiceIndexes.forEach(index => db.exec(index))

  console.log('✅ Service schema created')
}

export function createTicketSchema(): void {
  const db = getDatabase()

  const createTicketsTable = `
    CREATE TABLE  IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      service_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'served')),
      print_status TEXT DEFAULT 'pending' CHECK (print_status IN ('pending', 'printing', 'printed', 'print_failed')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      called_at TEXT,
      served_at TEXT,
      window_id INTEGER,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE,
      FOREIGN KEY(window_id) REFERENCES windows(id) ON DELETE SET NULL
    )
  `

  const createTicketIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_print_status ON tickets(print_status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_window_id ON tickets(window_id)'
  ]

  db.exec(createTicketsTable)
  createTicketIndexes.forEach(index => db.exec(index))

  console.log('✅ Ticket schema created')
}

export function createDeviceSchema(): void {
  const db = getDatabase()

  const createDevicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('display', 'customer', 'window', 'admin')),
      status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `

  const createDevicePrintersTable = `
    CREATE TABLE IF NOT EXISTS device_printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      printer_id TEXT NOT NULL,
      printer_name TEXT NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
      UNIQUE(device_id, printer_id)
    )
  `

  const createDeviceIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)',
    'CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type)',
    'CREATE INDEX IF NOT EXISTS idx_device_printers_device_id ON device_printers(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_device_printers_printer_id ON device_printers(printer_id)'
  ]

  db.exec(createDevicesTable)
  db.exec(createDevicePrintersTable)
  createDeviceIndexes.forEach(index => db.exec(index))

  console.log('✅ Device schema created')
}

export function createWindowSchema(): void {
  const db = getDatabase()

  const createWindowsTable = `
    CREATE TABLE IF NOT EXISTS windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      device_id TEXT,
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE SET NULL,
      FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE SET NULL
    )
  `

  const createWindowIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_windows_active ON windows(active)',
    'CREATE INDEX IF NOT EXISTS idx_windows_service_id ON windows(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_windows_device_id ON windows(device_id)'
  ]

  db.exec(createWindowsTable)
  createWindowIndexes.forEach(index => db.exec(index))

  console.log('✅ Window schema created')
}

export function createSystemSchema(): void {
  const db = getDatabase()

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

  const createSystemIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_daily_resets_date ON daily_resets(last_reset_date)',
    'CREATE INDEX IF NOT EXISTS idx_daily_resets_timestamp ON daily_resets(last_reset_timestamp)'
  ]

  db.exec(createDailyResetsTable)
  createSystemIndexes.forEach(index => db.exec(index))

  console.log('✅ System schema created')
}

export function createAllSchemas(): void {
  // Create schemas in the correct order to respect foreign key dependencies
  createServiceSchema()
  createDeviceSchema()
  createTicketSchema()
  createWindowSchema()
  createSystemSchema()

  console.log('✅ All database schemas re-created successfully')
}
