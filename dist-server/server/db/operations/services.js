"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceOperations = void 0;
const connection_1 = require("../connection");
exports.serviceOperations = {
    getAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM services ORDER BY name');
        return stmt.all();
    },
    getActive: () => {
        return exports.serviceOperations.getAll();
    },
    getById: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM services WHERE id = ?');
        return stmt.get(id);
    },
    getByName: (name) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM services WHERE name = ?');
        return stmt.get(name);
    },
    create: (service) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO services (name)
      VALUES (?)
      RETURNING *
    `);
        return stmt.get(service.name);
    },
    update: (id, service) => {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        if (service.name !== undefined) {
            fields.push('name = ?');
            values.push(service.name);
        }
        if (fields.length === 0) {
            return exports.serviceOperations.getById(id);
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = db.prepare(`
      UPDATE services
      SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(...values);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM services WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    getStatistics: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const totalStmt = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE service_id = ?');
        const totalResult = totalStmt.get(serviceId);
        const todayStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND DATE(created_at) = DATE('now')
    `);
        const todayResult = todayStmt.get(serviceId);
        const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND status = 'pending'
    `);
        const pendingResult = pendingStmt.get(serviceId);
        const servedStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE service_id = ? AND status = 'served'
    `);
        const servedResult = servedStmt.get(serviceId);
        const waitStmt = db.prepare(`
      SELECT AVG(
        ROUND((julianday(called_at) - julianday(created_at)) * 24 * 60)
      ) as avg_wait_minutes
      FROM tickets
      WHERE service_id = ? AND called_at IS NOT NULL
      AND DATE(created_at) = DATE('now')
    `);
        const waitResult = waitStmt.get(serviceId);
        return {
            totalTickets: totalResult.count,
            todayTickets: todayResult.count,
            pendingTickets: pendingResult.count,
            servedTickets: servedResult.count,
            averageWaitTime: waitResult.avg_wait_minutes || 0
        };
    },
    getAllWithStats: () => {
        const db = (0, connection_1.getDatabase)();
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
    `);
        return stmt.all();
    }
};
