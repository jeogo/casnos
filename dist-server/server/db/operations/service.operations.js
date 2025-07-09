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
      INSERT INTO services (name, updated_at)
      VALUES (?, CURRENT_TIMESTAMP)
    `);
        const result = stmt.run(service.name);
        return exports.serviceOperations.getById(result.lastInsertRowid);
    },
    update: (id, service) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE services
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(service.name, id);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM services WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    exists: (name) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM services WHERE name = ?');
        const result = stmt.get(name);
        return result.count > 0;
    },
    getCount: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM services');
        const result = stmt.get();
        return result.count;
    }
};
