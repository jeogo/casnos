import { getDatabase } from '../connection'
import { Ticket, DatabaseTicket } from '../../types'

export const ticketOperations = {
  getAll: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      ORDER BY created_at DESC
    `)
    return stmt.all() as Ticket[]
  },

  getById: (id: number): Ticket | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?')
    return stmt.get(id) as Ticket | undefined
  },

  getByServiceId: (serviceId: number): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE service_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(serviceId) as Ticket[]
  },

  getPendingTickets: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `)
    return stmt.all() as Ticket[]
  },

  getPendingByService: (serviceId: number): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending' AND service_id = ?
      ORDER BY created_at ASC
    `)
    return stmt.all(serviceId) as Ticket[]
  },

  getTicketsByPrintStatus: (printStatus: 'pending' | 'printing' | 'printed' | 'print_failed'): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE print_status = ?
      ORDER BY created_at ASC
    `)
    return stmt.all(printStatus) as Ticket[]
  },

  getCalledTickets: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'called'
      ORDER BY called_at DESC
    `)
    return stmt.all() as Ticket[]
  },

  getServedTickets: (): Ticket[] => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'served'
      ORDER BY called_at DESC
    `)
    return stmt.all() as Ticket[]
  },

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

  getNextGlobalNumber: (): number => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets')
    const result = stmt.get() as { next_number: number }
    return result.next_number
  },

  generateTicketNumber: (serviceId: number): string => {
    const nextNumber = ticketOperations.getNextGlobalNumber()
    return `${nextNumber.toString().padStart(3, '0')}`
  },

  create: (ticket: DatabaseTicket): Ticket => {
    const db = getDatabase()

    // Generate ticket number
    const ticketNumber = ticketOperations.generateTicketNumber(ticket.service_id)

    const stmt = db.prepare(`
      INSERT INTO tickets (
        ticket_number, service_id, service_name, status,
        print_status, printer_id, target_device
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)

    return stmt.get(
      ticketNumber,
      ticket.service_id,
      ticket.status || 'pending',
      ticket.print_status || 'pending',
    ) as Ticket
  },

  updateStatus: (id: number, status: Ticket['status'], windowId?: number): Ticket | undefined => {
    const db = getDatabase()
    const now = new Date().toISOString()
    const calledAt = status === 'called' ? now : null
    const servedAt = status === 'served' ? now : null

    if (windowId !== undefined) {
      // Update with window ID (when calling or serving a ticket)
      const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = COALESCE(?, called_at), served_at = COALESCE(?, served_at), window_id = ?
        WHERE id = ?
        RETURNING *
      `)
      return stmt.get(status, calledAt, servedAt, windowId, id) as Ticket | undefined
    } else {
      // Update only status and timestamps (preserve existing window_id)
      const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = COALESCE(?, called_at), served_at = COALESCE(?, served_at)
        WHERE id = ?
        RETURNING *
      `)
      return stmt.get(status, calledAt, servedAt, id) as Ticket | undefined
    }
  },

  updatePrintStatus: (id: number, printStatus: 'pending' | 'printing' | 'printed' | 'print_failed'): Ticket | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE tickets
      SET print_status = ?
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(printStatus, id) as Ticket | undefined
  },

  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM tickets WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  deleteAll: (): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM tickets')
    const result = stmt.run()
    return result.changes > 0
  },

  getStatistics: () => {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    return {
      total: ticketOperations.getAll().length,
      pending: ticketOperations.getPendingTickets().length,
      called: ticketOperations.getCalledTickets().length,
      served: ticketOperations.getServedTickets().length,
      today: ticketOperations.getTodayTickets().length
    }
  },

  resetSequence: (): void => {
    const db = getDatabase()
    db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'")
  }
}
