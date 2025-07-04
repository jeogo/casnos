import { getDatabase } from '../connection'
import { Device, DevicePrinter, DatabaseDevice, DatabaseDevicePrinter } from '../../types'

export const deviceOperations = {
  getAll: (): Device[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM devices ORDER BY device_type, name')
    return stmt.all() as Device[]
  },

  getById: (id: number): Device | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM devices WHERE id = ?')
    return stmt.get(id) as Device | undefined
  },

  getByDeviceId: (deviceId: string): Device | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM devices WHERE device_id = ?')
    return stmt.get(deviceId) as Device | undefined
  },

  getOnlineDevices: (): Device[] => {
    const db = getDatabase()
    const stmt = db.prepare("SELECT * FROM devices WHERE status = 'online' ORDER BY device_type, name")
    return stmt.all() as Device[]
  },

  getByType: (deviceType: string): Device[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM devices WHERE device_type = ? ORDER BY name')
    return stmt.all(deviceType) as Device[]
  },

  create: (device: DatabaseDevice): Device => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO devices (
        device_id, name, ip_address, device_type,
        status, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `)

    return stmt.get(
      device.device_id,
      device.name,
      device.ip_address,
      device.device_type,
      device.status || 'offline'
    ) as Device
  },

  update: (id: number, device: Partial<DatabaseDevice>): Device | undefined => {
    const db = getDatabase()
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
    if (device.device_type !== undefined) {
      fields.push('device_type = ?')
      values.push(device.device_type)
    }
    if (device.status !== undefined) {
      fields.push('status = ?')
      values.push(device.status)
    }

    if (fields.length === 0) return undefined

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`
      UPDATE devices SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `)

    return stmt.get(...values) as Device | undefined
  },

  updateStatus: (deviceId: string, status: 'online' | 'offline' | 'error'): Device | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE devices
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(status, deviceId) as Device | undefined
  },

  updateLastSeen: (deviceId: string): Device | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE devices
      SET updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(deviceId) as Device | undefined
  },

  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM devices WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  deleteByDeviceId: (deviceId: string): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM devices WHERE device_id = ?')
    const result = stmt.run(deviceId)
    return result.changes > 0
  },

  exists: (deviceId: string): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM devices WHERE device_id = ?')
    const result = stmt.get(deviceId) as { count: number }
    return result.count > 0
  },

  getStatistics: () => {
    const db = getDatabase()

    return {
      total: deviceOperations.getAll().length,
      online: deviceOperations.getOnlineDevices().length,
      byType: {
        display: deviceOperations.getByType('display').length,
        customer: deviceOperations.getByType('customer').length,
        window: deviceOperations.getByType('window').length,
        admin: deviceOperations.getByType('admin').length
      }
    }
  }
}

export const devicePrinterOperations = {
  getAll: (): DevicePrinter[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM device_printers ORDER BY device_id, printer_name')
    return stmt.all() as DevicePrinter[]
  },

  getById: (id: number): DevicePrinter | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM device_printers WHERE id = ?')
    return stmt.get(id) as DevicePrinter | undefined
  },

  getByDeviceId: (deviceId: string): DevicePrinter[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM device_printers WHERE device_id = ? ORDER BY printer_name')
    return stmt.all(deviceId) as DevicePrinter[]
  },

  getByPrinterId: (printerId: string): DevicePrinter | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM device_printers WHERE printer_id = ?')
    return stmt.get(printerId) as DevicePrinter | undefined
  },

  create: (printer: DatabaseDevicePrinter): DevicePrinter => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO device_printers (
        device_id, printer_id, printer_name,
        is_default, updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `)

    return stmt.get(
      printer.device_id,
      printer.printer_id,
      printer.printer_name,
      printer.is_default ? 1 : 0
    ) as DevicePrinter
  },

  update: (id: number, printer: Partial<DatabaseDevicePrinter>): DevicePrinter | undefined => {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (printer.printer_name !== undefined) {
      fields.push('printer_name = ?')
      values.push(printer.printer_name)
    }
    if (printer.is_default !== undefined) {
      fields.push('is_default = ?')
      values.push(printer.is_default)
    }

    if (fields.length === 0) return undefined

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`
      UPDATE device_printers SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `)

    return stmt.get(...values) as DevicePrinter | undefined
  },

  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM device_printers WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}
