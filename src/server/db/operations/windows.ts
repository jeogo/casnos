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
    // Insert new window with active status only
    const stmt = db.prepare('INSERT INTO windows (active) VALUES (?) RETURNING *')
    const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1
    return stmt.get(activeValue) as Window
  },

  /**
   * Update window active status
   */
  update: (id: number, windowData: Partial<DatabaseWindow>): Window | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('UPDATE windows SET active = ? WHERE id = ? RETURNING *')
    const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1
    return stmt.get(activeValue, id) as Window | undefined
  },

  /**
   * Delete window
   */
  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM windows WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}
