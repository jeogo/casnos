// Ticket operations - Core queue management
import { getDatabase } from '../connection'
import type { Ticket, DatabaseTicket } from '../../types'

/**
 * Ticket operations for queue management
 */
export const ticketOperations = {
  /**
   * Get all tickets
   */
  getAll: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      ORDER BY created_at DESC
    `)
    return stmt.all() as Ticket[]
  },

  /**
   * Get ticket by ID
   */
  getById: (id: number): Ticket | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?')
    return stmt.get(id) as Ticket | undefined
  },

  /**
   * Get tickets by service ID
   */
  getByServiceId: (serviceId: number): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE service_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(serviceId) as Ticket[]
  },

  /**
   * Get pending tickets (in queue)
   */
  getPendingTickets: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `)
    return stmt.all() as Ticket[]
  },

  /**
   * Get pending tickets for specific service
   */
  getPendingTicketsByService: (serviceId: number): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending' AND service_id = ?
      ORDER BY created_at ASC
    `)
    return stmt.all(serviceId) as Ticket[]
  },

  /**
   * Get called tickets
   */
  getCalledTickets: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'called'
      ORDER BY called_at DESC
    `)
    return stmt.all() as Ticket[]
  },

  /**
   * Get next ticket number
   */
  getNextTicketNumber: (): number => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets')
    const result = stmt.get() as { next_number: number }
    return result.next_number
  },

  /**
   * Create new ticket
   */
  create: (ticket: DatabaseTicket): Ticket => {
    const db = getDatabase()

    // Generate ticket number
    const nextNumber = ticketOperations.getNextTicketNumber()
    const ticketNumber = nextNumber.toString()

    const stmt = db.prepare(`
      INSERT INTO tickets (ticket_number, service_id, status, print_status)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `)

    const newTicket = stmt.get(
      ticketNumber,
      ticket.service_id,
      ticket.status || 'pending',
      ticket.print_status || 'pending'
    ) as Ticket

    return newTicket
  },

  /**
   * Update ticket status
   */
  updateStatus: (id: number, status: Ticket['status'], windowId?: number): Ticket | undefined => {
    const db = getDatabase()
    let updates: string[] = ['status = ?']
    let params: any[] = [status]

    // Add called_at timestamp if status is 'called'
    if (status === 'called') {
      updates.push('called_at = ?')
      params.push(new Date().toISOString())
    }

    // Add served_at timestamp if status is 'served'
    if (status === 'served') {
      updates.push('served_at = ?')
      params.push(new Date().toISOString())
    }

    // Add window_id if provided
    if (windowId !== undefined) {
      updates.push('window_id = ?')
      params.push(windowId)
    }

    // Build the update query
    const updateQuery = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `

    // Add the ticket ID as the last parameter
    params.push(id)

    const stmt = db.prepare(updateQuery)
    return stmt.get(...params) as Ticket | undefined
  },

  /**
   * Update print status
   */
  updatePrintStatus: (id: number, printStatus: Ticket['print_status']): Ticket | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE tickets
      SET print_status = ?
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(printStatus, id) as Ticket | undefined
  },

  // Priority and notes functions removed as these fields no longer exist in the schema

  /**
   * Delete ticket
   */
  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM tickets WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  /**
   * Get today's tickets
   */
  getTodayTickets: (): Ticket[] => {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE DATE(created_at) = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(today) as Ticket[]
  },

  /**
   * Get queue position for a ticket
   */
  getQueuePosition: (ticketId: number): number => {
    const db = getDatabase()
    const ticket = ticketOperations.getById(ticketId)
    if (!ticket || ticket.status !== 'pending') return 0

    const stmt = db.prepare(`
      SELECT COUNT(*) as position
      FROM tickets
      WHERE service_id = ? AND status = 'pending' AND created_at <= ?
    `)
    const result = stmt.get(ticket.service_id, ticket.created_at) as { position: number }
    return result.position
  },

  /**
   * Get average wait time for service
   */
  getAverageWaitTime: (serviceId: number): number => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT AVG(
        ROUND((julianday(called_at) - julianday(created_at)) * 24 * 60)
      ) as avg_wait_minutes
      FROM tickets
      WHERE service_id = ? AND called_at IS NOT NULL
      AND DATE(created_at) = DATE('now')
    `)
    const result = stmt.get(serviceId) as { avg_wait_minutes: number | null }
    return result.avg_wait_minutes || 0
  },

  /**
   * Clear all tickets (daily reset)
   */
  clearAll: (): boolean => {
    const db = getDatabase()
    try {
      db.exec('DELETE FROM tickets')
      db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'")
      return true
    } catch (error) {
      console.error('Error clearing tickets:', error)
      return false
    }
  }
}
