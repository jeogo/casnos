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
    getPendingByService: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'pending' AND service_id = ?
      ORDER BY created_at ASC
    `);
        return stmt.all(serviceId);
    },
    getTicketsByPrintStatus: (printStatus) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE print_status = ?
      ORDER BY created_at ASC
    `);
        return stmt.all(printStatus);
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
    getServedTickets: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE status = 'served'
      ORDER BY called_at DESC
    `);
        return stmt.all();
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
    getNextGlobalNumber: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets');
        const result = stmt.get();
        return result.next_number;
    },
    generateTicketNumber: (serviceId) => {
        const nextNumber = exports.ticketOperations.getNextGlobalNumber();
        return `${nextNumber.toString().padStart(3, '0')}`;
    },
    create: (ticket) => {
        const db = (0, connection_1.getDatabase)();
        const ticketNumber = exports.ticketOperations.generateTicketNumber(ticket.service_id);
        const stmt = db.prepare(`
      INSERT INTO tickets (
        ticket_number, service_id, service_name, status,
        print_status, printer_id, target_device
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
        return stmt.get(ticketNumber, ticket.service_id, ticket.status || 'pending', ticket.print_status || 'pending');
    },
    updateStatus: (id, status, windowId) => {
        const db = (0, connection_1.getDatabase)();
        const now = new Date().toISOString();
        const calledAt = status === 'called' ? now : null;
        const servedAt = status === 'served' ? now : null;
        if (windowId !== undefined) {
            const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = COALESCE(?, called_at), served_at = COALESCE(?, served_at), window_id = ?
        WHERE id = ?
        RETURNING *
      `);
            return stmt.get(status, calledAt, servedAt, windowId, id);
        }
        else {
            const stmt = db.prepare(`
        UPDATE tickets
        SET status = ?, called_at = COALESCE(?, called_at), served_at = COALESCE(?, served_at)
        WHERE id = ?
        RETURNING *
      `);
            return stmt.get(status, calledAt, servedAt, id);
        }
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
    deleteAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM tickets');
        const result = stmt.run();
        return result.changes > 0;
    },
    getStatistics: () => {
        const db = (0, connection_1.getDatabase)();
        const today = new Date().toISOString().split('T')[0];
        return {
            total: exports.ticketOperations.getAll().length,
            pending: exports.ticketOperations.getPendingTickets().length,
            called: exports.ticketOperations.getCalledTickets().length,
            served: exports.ticketOperations.getServedTickets().length,
            today: exports.ticketOperations.getTodayTickets().length
        };
    },
    resetSequence: () => {
        const db = (0, connection_1.getDatabase)();
        db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'");
    }
};
