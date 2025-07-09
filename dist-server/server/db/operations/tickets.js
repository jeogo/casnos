"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketOperations = void 0;
const connection_1 = require("../connection");
exports.ticketOperations = {
    getAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      ORDER BY created_at DESC
    `);
        return stmt.all();
    },
    getById: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
        return stmt.get(id);
    },
    getByServiceId: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE service_id = ?
      ORDER BY created_at DESC
    `);
        return stmt.all(serviceId);
    },
    getPendingTickets: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
        return stmt.all();
    },
    getPendingTicketsByService: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending' AND service_id = ?
      ORDER BY created_at ASC
    `);
        return stmt.all(serviceId);
    },
    getCalledTickets: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'called'
      ORDER BY called_at DESC
    `);
        return stmt.all();
    },
    getNextTicketNumber: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets');
        const result = stmt.get();
        return result.next_number;
    },
    create: (ticket) => {
        const db = (0, connection_1.getDatabase)();
        const nextNumber = exports.ticketOperations.getNextTicketNumber();
        const ticketNumber = nextNumber.toString();
        const stmt = db.prepare(`
      INSERT INTO tickets (ticket_number, service_id, status, print_status)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
        const newTicket = stmt.get(ticketNumber, ticket.service_id, ticket.status || 'pending', ticket.print_status || 'pending');
        return newTicket;
    },
    updateStatus: (id, status, windowId) => {
        const db = (0, connection_1.getDatabase)();
        let updates = ['status = ?'];
        let params = [status];
        if (status === 'called') {
            updates.push('called_at = ?');
            params.push(new Date().toISOString());
        }
        if (status === 'served') {
            updates.push('served_at = ?');
            params.push(new Date().toISOString());
        }
        if (windowId !== undefined) {
            updates.push('window_id = ?');
            params.push(windowId);
        }
        const updateQuery = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `;
        params.push(id);
        const stmt = db.prepare(updateQuery);
        return stmt.get(...params);
    },
    updatePrintStatus: (id, printStatus) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE tickets
      SET print_status = ?
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(printStatus, id);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM tickets WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    getTodayTickets: () => {
        const db = (0, connection_1.getDatabase)();
        const today = new Date().toISOString().split('T')[0];
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE DATE(created_at) = ?
      ORDER BY created_at DESC
    `);
        return stmt.all(today);
    },
    getQueuePosition: (ticketId) => {
        const db = (0, connection_1.getDatabase)();
        const ticket = exports.ticketOperations.getById(ticketId);
        if (!ticket || ticket.status !== 'pending')
            return 0;
        const stmt = db.prepare(`
      SELECT COUNT(*) as position
      FROM tickets
      WHERE service_id = ? AND status = 'pending' AND created_at <= ?
    `);
        const result = stmt.get(ticket.service_id, ticket.created_at);
        return result.position;
    },
    getAverageWaitTime: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT AVG(
        ROUND((julianday(called_at) - julianday(created_at)) * 24 * 60)
      ) as avg_wait_minutes
      FROM tickets
      WHERE service_id = ? AND called_at IS NOT NULL
      AND DATE(created_at) = DATE('now')
    `);
        const result = stmt.get(serviceId);
        return result.avg_wait_minutes || 0;
    },
    clearAll: () => {
        const db = (0, connection_1.getDatabase)();
        try {
            db.exec('DELETE FROM tickets');
            db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'");
            return true;
        }
        catch (error) {
            console.error('Error clearing tickets:', error);
            return false;
        }
    }
};
