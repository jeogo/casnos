// Service operations - Service management
import { getDatabase } from '../connection'
import type { Service, DatabaseService } from '../../types'

/**
 * Service operations for managing queue services
 */
export const serviceOperations = {
  /**
   * Get all services
   */
  getAll: (): Service[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services ORDER BY name')
    return stmt.all() as Service[]
  },

  /**
   * Get active services only
   */
  getActive: (): Service[] => {
    return serviceOperations.getAll()
  },

  /**
   * Get service by ID
   */
  getById: (id: number): Service | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?')
    return stmt.get(id) as Service | undefined
  },

  /**
   * Get service by name
   */
  getByName: (name: string): Service | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services WHERE name = ?')
    return stmt.get(name) as Service | undefined
  },

  /**
   * Create new service
   */
  create: (service: DatabaseService): Service => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO services (name)
      VALUES (?)
      RETURNING *
    `)
    return stmt.get(service.name) as Service
  },

  /**
   * Update service
   */
  update: (id: number, service: Partial<DatabaseService>): Service | undefined => {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (service.name !== undefined) {
      fields.push('name = ?')
      values.push(service.name)
    }





    if (fields.length === 0) {
      return serviceOperations.getById(id)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`
      UPDATE services
      SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(...values) as Service | undefined
  },



  /**
   * Delete service
   */
  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM services WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  /**
   * Get service statistics
   */
  getStatistics: (serviceId: number): {
    totalTickets: number
    todayTickets: number
    pendingTickets: number
    servedTickets: number
    averageWaitTime: number
  } => {
    const db = getDatabase()

    // Total tickets for this service
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE service_id = ?')
    const totalResult = totalStmt.get(serviceId) as { count: number }

    // Today's tickets
    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND DATE(created_at) = DATE('now')
    `)
    const todayResult = todayStmt.get(serviceId) as { count: number }

    // Pending tickets
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND status = 'pending'
    `)
    const pendingResult = pendingStmt.get(serviceId) as { count: number }

    // Served tickets
    const servedStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND status = 'served'
    `)
    const servedResult = servedStmt.get(serviceId) as { count: number }

    // Average wait time (in minutes)
    const waitStmt = db.prepare(`
      SELECT AVG(
        ROUND((julianday(called_at) - julianday(created_at)) * 24 * 60)
      ) as avg_wait_minutes
      FROM tickets
      WHERE service_id = ? AND called_at IS NOT NULL
      AND DATE(created_at) = DATE('now')
    `)
    const waitResult = waitStmt.get(serviceId) as { avg_wait_minutes: number | null }

    return {
      totalTickets: totalResult.count,
      todayTickets: todayResult.count,
      pendingTickets: pendingResult.count,
      servedTickets: servedResult.count,
      averageWaitTime: waitResult.avg_wait_minutes || 0
    }
  },

  /**
   * Get all services with their current statistics
   */
  getAllWithStats: (): Array<Service & {
    pendingCount: number
    todayCount: number
    averageWaitTime: number
  }> => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT
        s.*,
        COALESCE(pending.count, 0) as pendingCount,
        COALESCE(today.count, 0) as todayCount,
        COALESCE(wait.avg_wait_minutes, 0) as averageWaitTime
      FROM services s
      LEFT JOIN (
        SELECT service_id, COUNT(*) as count
        FROM tickets
        WHERE status = 'pending'
        GROUP BY service_id
      ) pending ON s.id = pending.service_id
      LEFT JOIN (
        SELECT service_id, COUNT(*) as count
        FROM tickets
        WHERE DATE(created_at) = DATE('now')
        GROUP BY service_id
      ) today ON s.id = today.service_id
      LEFT JOIN (
        SELECT service_id, AVG(
          ROUND((julianday(called_at) - julianday(created_at)) * 24 * 60)
        ) as avg_wait_minutes
        FROM tickets
        WHERE called_at IS NOT NULL AND DATE(created_at) = DATE('now')
        GROUP BY service_id
      ) wait ON s.id = wait.service_id
      ORDER BY s.name
    `)
    return stmt.all() as Array<Service & {
      pendingCount: number
      todayCount: number
      averageWaitTime: number
    }>
  }
}
