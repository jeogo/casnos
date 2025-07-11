// Window operations - Professional window management for CASNOS

import { Window, DatabaseWindow } from '../../types'
import { getDatabase } from '../connection'
/**
 * Professional window operations for managing service windows
 * Simplified for CASNOS queue system
 */
export const windowOperations = {
  /**
   * Get all windows
   */
  getAll: (): Window[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows ORDER BY id')
    return stmt.all() as Window[]
  },

  /**
   * Get active windows only
   */
  getActiveWindows: (): Window[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows WHERE active = 1 ORDER BY id')
    return stmt.all() as Window[]
  },

  /**
   * Get window by ID
   */
  getById: (id: number): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows WHERE id = ?')
    return stmt.get(id) as Window | undefined
  },

  /**
   * Create new window
   */
  create: (windowData: DatabaseWindow): Window => {
    const db = getDatabase()
    // Insert new window with service_id, device_id and active status
    const stmt = db.prepare(`
      INSERT INTO windows (service_id, device_id, active, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `)
    const serviceId = windowData.service_id !== undefined ? windowData.service_id : null
    const deviceId = windowData.device_id !== undefined ? windowData.device_id : null
    const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1
    return stmt.get(serviceId, deviceId, activeValue) as Window
  },

  /**
   * Update window active status and service
   */
  update: (id: number, windowData: Partial<DatabaseWindow>): Window | undefined => {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (windowData.service_id !== undefined) {
      fields.push('service_id = ?')
      values.push(windowData.service_id)
    }

    if (windowData.device_id !== undefined) {
      fields.push('device_id = ?')
      values.push(windowData.device_id)
    }

    if (windowData.active !== undefined) {
      fields.push('active = ?')
      values.push(windowData.active ? 1 : 0)
    }

    if (fields.length === 0) {
      return undefined // Nothing to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`
      UPDATE windows SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(...values) as Window | undefined
  },

  /**
   * Delete window
   */
  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM windows WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  /**
   * Get windows by service ID
   */
  getByServiceId: (serviceId: number): Window[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows WHERE service_id = ? ORDER BY id')
    return stmt.all(serviceId) as Window[]
  },

  /**
   * Get active windows by service ID
   */
  getActiveByServiceId: (serviceId: number): Window[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows WHERE service_id = ? AND active = 1 ORDER BY id')
    return stmt.all(serviceId) as Window[]
  },

  /**
   * Assign service to window
   */
  assignService: (windowId: number, serviceId: number): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE windows
      SET service_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(serviceId, windowId) as Window | undefined
  },

  /**
   * Remove service from window
   */
  removeService: (windowId: number): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE windows
      SET service_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(windowId) as Window | undefined
  },

  /**
   * Get window by device ID
   */
  getByDeviceId: (deviceId: string): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM windows WHERE device_id = ?')
    return stmt.get(deviceId) as Window | undefined
  },

  /**
   * Create or update window for device (idempotent operation)
   */
  createOrUpdateForDevice: (deviceId: string, windowData: Partial<DatabaseWindow>): Window => {

    // First check if window exists for this device
    const existingWindow = windowOperations.getByDeviceId(deviceId)

    if (existingWindow) {
      // Update existing window
      const updated = windowOperations.update(existingWindow.id, {
        ...windowData,
        device_id: deviceId,
        active: true // Activate when device connects
      })
      return updated || existingWindow
    } else {
      // Create new window
      return windowOperations.create({
        ...windowData,
        device_id: deviceId,
        active: true
      })
    }
  },

  /**
   * Activate window for device
   */
  activateForDevice: (deviceId: string): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE windows
      SET active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(deviceId) as Window | undefined
  },

  /**
   * Deactivate window for device
   */
  deactivateForDevice: (deviceId: string): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE windows
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `)
    return stmt.get(deviceId) as Window | undefined
  },
}
