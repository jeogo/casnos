"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemOperations = void 0;
const connection_1 = require("../connection");
exports.systemOperations = {
    getLastReset: () => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM daily_resets
      ORDER BY last_reset_timestamp DESC
      LIMIT 1
    `);
        return stmt.get();
    },
    getResetByDate: (date) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM daily_resets WHERE last_reset_date = ?');
        return stmt.get(date);
    },
    createResetRecord: (record) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO daily_resets (
        last_reset_date, last_reset_timestamp,
        tickets_reset, pdfs_reset, cache_reset
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
        return stmt.get(record.last_reset_date, record.last_reset_timestamp, record.tickets_reset ? 1 : 0, record.pdfs_reset ? 1 : 0, record.cache_reset ? 1 : 0);
    },
    updateResetRecord: (date, updates) => {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        if (updates.last_reset_timestamp !== undefined) {
            fields.push('last_reset_timestamp = ?');
            values.push(updates.last_reset_timestamp);
        }
        if (updates.tickets_reset !== undefined) {
            fields.push('tickets_reset = ?');
            values.push(updates.tickets_reset ? 1 : 0);
        }
        if (updates.pdfs_reset !== undefined) {
            fields.push('pdfs_reset = ?');
            values.push(updates.pdfs_reset ? 1 : 0);
        }
        if (updates.cache_reset !== undefined) {
            fields.push('cache_reset = ?');
            values.push(updates.cache_reset ? 1 : 0);
        }
        if (fields.length === 0)
            return undefined;
        values.push(date);
        const stmt = db.prepare(`
      UPDATE daily_resets SET ${fields.join(', ')}
      WHERE last_reset_date = ?
      RETURNING *
    `);
        return stmt.get(...values);
    },
    needsReset: () => {
        const today = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10);
        const lastReset = exports.systemOperations.getResetByDate(today);
        return !lastReset;
    },
    performTicketReset: () => {
        const db = (0, connection_1.getDatabase)();
        db.exec('DELETE FROM tickets');
        db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'");
        console.log('✅ Ticket reset completed');
    },
    getDatabaseStats: () => {
        const db = (0, connection_1.getDatabase)();
        const tables = ['services', 'tickets', 'windows', 'devices', 'device_printers', 'daily_resets'];
        const stats = {};
        for (const table of tables) {
            try {
                const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
                const result = stmt.get();
                stats[table] = result.count;
            }
            catch (error) {
                stats[table] = 0;
            }
        }
        return {
            tables: stats,
            totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
            timestamp: new Date().toISOString()
        };
    },
    vacuum: () => {
        const db = (0, connection_1.getDatabase)();
        db.exec('VACUUM');
        console.log('✅ Database vacuum completed');
    },
    analyze: () => {
        const db = (0, connection_1.getDatabase)();
        db.exec('ANALYZE');
        console.log('✅ Database analyze completed');
    },
    healthCheck: () => {
        const db = (0, connection_1.getDatabase)();
        try {
            const testQuery = db.prepare('SELECT 1 as test');
            const result = testQuery.get();
            if (result.test !== 1) {
                throw new Error('Database connectivity test failed');
            }
            const pragma = {
                journal_mode: db.pragma('journal_mode', { simple: true }),
                synchronous: db.pragma('synchronous', { simple: true }),
                cache_size: db.pragma('cache_size', { simple: true }),
                page_size: db.pragma('page_size', { simple: true }),
                page_count: db.pragma('page_count', { simple: true })
            };
            return {
                status: 'healthy',
                pragma,
                stats: exports.systemOperations.getDatabaseStats(),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    }
};
