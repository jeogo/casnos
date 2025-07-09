"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicePrinterOperations = exports.deviceOperations = void 0;
const connection_1 = require("../connection");
exports.deviceOperations = {
    getAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM devices ORDER BY device_type, name');
        return stmt.all();
    },
    getById: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM devices WHERE id = ?');
        return stmt.get(id);
    },
    getByDeviceId: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM devices WHERE device_id = ?');
        return stmt.get(deviceId);
    },
    getOnlineDevices: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare("SELECT * FROM devices WHERE status = 'online' ORDER BY device_type, name");
        return stmt.all();
    },
    getByType: (deviceType) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM devices WHERE device_type = ? ORDER BY name');
        return stmt.all(deviceType);
    },
    create: (device) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO devices (
        device_id, name, ip_address, device_type,
        status, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `);
        return stmt.get(device.device_id, device.name, device.ip_address, device.device_type, device.status || 'offline');
    },
    update: (id, device) => {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        if (device.name !== undefined) {
            fields.push('name = ?');
            values.push(device.name);
        }
        if (device.ip_address !== undefined) {
            fields.push('ip_address = ?');
            values.push(device.ip_address);
        }
        if (device.device_type !== undefined) {
            fields.push('device_type = ?');
            values.push(device.device_type);
        }
        if (device.status !== undefined) {
            fields.push('status = ?');
            values.push(device.status);
        }
        if (fields.length === 0)
            return undefined;
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = db.prepare(`
      UPDATE devices SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(...values);
    },
    updateStatus: (deviceId, status) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE devices
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `);
        return stmt.get(status, deviceId);
    },
    updateLastSeen: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE devices
      SET updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
      RETURNING *
    `);
        return stmt.get(deviceId);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM devices WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    deleteByDeviceId: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('DELETE FROM devices WHERE device_id = ?');
        const result = stmt.run(deviceId);
        return result.changes > 0;
    },
    exists: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM devices WHERE device_id = ?');
        const result = stmt.get(deviceId);
        return result.count > 0;
    },
    getStatistics: () => {
        const db = (0, connection_1.getDatabase)();
        return {
            total: exports.deviceOperations.getAll().length,
            online: exports.deviceOperations.getOnlineDevices().length,
            byType: {
                display: exports.deviceOperations.getByType('display').length,
                customer: exports.deviceOperations.getByType('customer').length,
                window: exports.deviceOperations.getByType('window').length,
                admin: exports.deviceOperations.getByType('admin').length
            }
        };
    }
};
exports.devicePrinterOperations = {
    getAll: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM device_printers ORDER BY device_id, printer_name');
        return stmt.all();
    },
    getById: (id) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM device_printers WHERE id = ?');
        return stmt.get(id);
    },
    getByDeviceId: (deviceId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM device_printers WHERE device_id = ? ORDER BY printer_name');
        return stmt.all(deviceId);
    },
    getByPrinterId: (printerId) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM device_printers WHERE printer_id = ?');
        return stmt.get(printerId);
    },
    create: (printer) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO device_printers (
        device_id, printer_id, printer_name,
        is_default, updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `);
        return stmt.get(printer.device_id, printer.printer_id, printer.printer_name, printer.is_default ? 1 : 0);
    },
    update: (id, printer) => {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        if (printer.printer_name !== undefined) {
            fields.push('printer_name = ?');
            values.push(printer.printer_name);
        }
        if (printer.is_default !== undefined) {
            fields.push('is_default = ?');
            values.push(printer.is_default);
        }
        if (fields.length === 0)
            return undefined;
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = db.prepare(`
      UPDATE device_printers SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `);
        return stmt.get(...values);
    },
    delete: (id) => {
        const db = (0, connection_1.getDatabase)();
        console.log('[DB] Attempting to delete printer with ID:', id);
        const checkStmt = db.prepare('SELECT id, printer_name FROM device_printers WHERE id = ?');
        const existingPrinter = checkStmt.get(id);
        console.log('[DB] Existing printer before deletion:', existingPrinter);
        if (!existingPrinter) {
            console.log('[DB] Printer not found with ID:', id);
            return false;
        }
        const stmt = db.prepare('DELETE FROM device_printers WHERE id = ?');
        const result = stmt.run(id);
        console.log('[DB] Delete operation result:', {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
            deleted: result.changes > 0
        });
        return result.changes > 0;
    }
};
