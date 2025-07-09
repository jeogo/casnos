"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDailyReset = setupDailyReset;
exports.performManualReset = performManualReset;
exports.getResetHistory = getResetHistory;
exports.isResetNeeded = isResetNeeded;
function setupDailyReset(db) {
    try {
        initializeDailyResetTable(db);
        performDailyResetIfNeeded(db);
    }
    catch (error) {
        console.error('Daily reset setup failed:', error);
        throw error;
    }
}
function initializeDailyResetTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS daily_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_reset_date TEXT NOT NULL UNIQUE,
      last_reset_timestamp TEXT NOT NULL,
      tickets_reset INTEGER DEFAULT 0,
      pdfs_reset INTEGER DEFAULT 0,
      cache_reset INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
function performDailyResetIfNeeded(db) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const lastReset = db.prepare('SELECT last_reset_date FROM daily_resets WHERE last_reset_date = ?').get(today);
        if (!lastReset) {
            console.log('🔄 Performing daily reset...');
            const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
            db.exec('DELETE FROM tickets');
            db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'");
            const stmt = db.prepare(`
        INSERT INTO daily_resets (last_reset_date, last_reset_timestamp, tickets_reset)
        VALUES (?, ?, ?)
      `);
            stmt.run(today, new Date().toISOString(), ticketCount.count);
            console.log(`✅ Daily reset completed - ${ticketCount.count} tickets cleared`);
        }
        else {
            console.log('✅ Daily reset already performed today');
        }
    }
    catch (error) {
        console.error('❌ Daily reset failed:', error);
    }
}
function performManualReset(db) {
    try {
        const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
        db.exec('DELETE FROM tickets');
        db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'");
        const today = new Date().toISOString().split('T')[0];
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_resets (last_reset_date, last_reset_timestamp, tickets_reset)
      VALUES (?, ?, ?)
    `);
        stmt.run(today, new Date().toISOString(), ticketCount.count);
        return {
            success: true,
            ticketsCleared: ticketCount.count,
            message: `Manual reset completed - ${ticketCount.count} tickets cleared`
        };
    }
    catch (error) {
        console.error('Manual reset failed:', error);
        return {
            success: false,
            ticketsCleared: 0,
            message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
function getResetHistory(db) {
    try {
        const stmt = db.prepare(`
      SELECT * FROM daily_resets
      ORDER BY last_reset_date DESC
      LIMIT 30
    `);
        return stmt.all();
    }
    catch (error) {
        console.error('Error getting reset history:', error);
        return [];
    }
}
function isResetNeeded(db) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const lastReset = db.prepare('SELECT last_reset_date FROM daily_resets WHERE last_reset_date = ?').get(today);
        return !lastReset;
    }
    catch (error) {
        console.error('Error checking reset status:', error);
        return false;
    }
}
