"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowOperations = void 0;
const connection_1 = require("../connection");
exports.windowOperations = {
    getAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows ORDER BY id');
        return stmt.all();
    },
    getActiveWindows: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows WHERE active = 1 ORDER BY id');
        return stmt.all();
    },
    getById: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows WHERE id = ?');
        return stmt.get(id);
    },
    create: (windowData) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO windows (service_id, device_id, active, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `);
        const serviceId = windowData.service_id !== undefined ? windowData.service_id : null;
        const deviceId = windowData.device_id !== undefined ? windowData.device_id : null;
        const activeValue = windowData.active !== undefined ? (windowData.active ? 1 : 0) : 1;
        return stmt.get(serviceId, deviceId, activeValue);
    },
    update: (id, windowData) => {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        if (windowData.service_id !== undefined) {
            fields.push('service_id = ?');
            values.push(windowData.service_id);
        }
        if (windowData.device_id !== undefined) {
            fields.push('device_id = ?');
            values.push(windowData.device_id);
        }
        if (windowData.active !== undefined) {
            fields.push('active = ?');
            values.push(windowData.active ? 1 : 0);
        }
        if (fields.length === 0) {
            return undefined;
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = db.prepare(`
      UPDATE windows SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(...values);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM windows WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    getByServiceId: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows WHERE service_id = ? ORDER BY id');
        return stmt.all(serviceId);
    },
    getActiveByServiceId: (serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows WHERE service_id = ? AND active = 1 ORDER BY id');
        return stmt.all(serviceId);
    },
    assignService: (windowId, serviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE windows
      SET service_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(serviceId, windowId);
    },
    removeService: (windowId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE windows
      SET service_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(windowId);
    },
    getByDeviceId: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM windows WHERE device_id = ?');
        return stmt.get(deviceId);
    },
    createOrUpdateForDevice: (deviceId, windowData) => {
        const db = (0, connection_1.getDatabase)();
        const existingWindow = exports.windowOperations.getByDeviceId(deviceId);
        if (existingWindow) {
            const updated = exports.windowOperations.update(existingWindow.id, {
                ...windowData,
                device_id: deviceId,
                active: true
            });
            return updated || existingWindow;
        }
        else {
            return exports.windowOperations.create({
                ...windowData,
                device_id: deviceId,
                active: true
            });
        }
    },
    activateForDevice: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE windows
      SET active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `);
        return stmt.get(deviceId);
    },
    deactivateForDevice: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE windows
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `);
        return stmt.get(deviceId);
    },
};
