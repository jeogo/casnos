"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyResetManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("../db/connection");
class DailyResetManager {
    constructor() {
        this.resetInterval = null;
        this.config = {
            enabled: true,
            resetPDFs: true,
            resetTickets: true,
            resetCache: true,
            keepDays: 30,
            resetTime: '00:00'
        };
        this.scheduleAutomaticReset();
    }
    async performResetOnStartup() {
        if (!this.config.enabled) {
            return;
        }
        const startTime = Date.now();
        try {
            const needsReset = await this.needsDailyReset();
            if (!needsReset) {
                return;
            }
            if (this.config.resetTickets) {
                await this.resetTicketNumbers();
            }
            if (this.config.resetPDFs) {
                await this.cleanupPDFFiles();
            }
            if (this.config.resetCache) {
                await this.clearAllCache();
            }
            await this.cleanupOldData();
            await this.optimizeDatabase();
            await this.recordDailyReset();
            const duration = Date.now() - startTime;
            this.notifyClientsOfReset();
        }
        catch (error) {
            throw error;
        }
    }
    async resetTicketNumbers() {
        try {
            const db = (0, connection_1.getDatabase)();
            await db.prepare('DELETE FROM tickets').run();
            await db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'tickets'`).run();
            try {
                await db.prepare(`
          UPDATE services
          SET last_ticket_number = 0
          WHERE last_ticket_number IS NOT NULL
        `).run();
            }
            catch (err) {
            }
        }
        catch (error) {
            throw error;
        }
    }
    async cleanupPDFFiles() {
        try {
            const pdfDirectories = [
                'resources/tickets',
                'temp/pdf',
                'temp',
                'public/pdfs',
                'storage/pdfs',
                'data/pdfs',
                'generated/pdfs',
                'output/tickets'
            ];
            let totalDeleted = 0;
            for (const dir of pdfDirectories) {
                const fullPath = path_1.default.resolve(dir);
                if (fs_1.default.existsSync(fullPath)) {
                    const deleted = await this.cleanDirectory(fullPath, '.pdf');
                    totalDeleted += deleted;
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    async clearAllCache() {
        try {
            await this.clearDatabaseCache();
            const cacheDirectories = [
                'cache',
                '.cache',
                'temp/cache',
                'storage/cache',
                'data/cache',
                'node_modules/.cache',
                'public/cache',
                'temp'
            ];
            let totalDeleted = 0;
            for (const dir of cacheDirectories) {
                const fullPath = path_1.default.resolve(dir);
                if (fs_1.default.existsSync(fullPath)) {
                    const deleted = await this.cleanDirectory(fullPath);
                    totalDeleted += deleted;
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    async clearDatabaseCache() {
        try {
            const db = (0, connection_1.getDatabase)();
            const cacheTables = [
                'cache_statistics',
                'cache_queue_status',
                'temp_calculations',
                'session_cache',
                'temp_data'
            ];
            for (const table of cacheTables) {
                try {
                    await db.prepare(`DELETE FROM ${table}`).run();
                }
                catch (err) {
                }
            }
            try {
                await db.prepare(`
          DELETE FROM device_sessions
          WHERE last_heartbeat < datetime('now', '-1 hour')
        `).run();
            }
            catch (err) {
            }
        }
        catch (error) {
            throw error;
        }
    }
    async cleanupOldData() {
        try {
            const db = (0, connection_1.getDatabase)();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.keepDays);
            const oldDataQueries = [
                `DELETE FROM device_logs WHERE created_at < '${cutoffDate.toISOString()}'`,
                `DELETE FROM error_logs WHERE created_at < '${cutoffDate.toISOString()}'`,
                `DELETE FROM audit_trail WHERE created_at < '${cutoffDate.toISOString()}'`,
                `DELETE FROM print_history WHERE created_at < '${cutoffDate.toISOString()}'`
            ];
            for (const query of oldDataQueries) {
                try {
                    const result = await db.prepare(query).run();
                }
                catch (err) {
                }
            }
            await this.cleanupLogFiles();
        }
        catch (error) {
            throw error;
        }
    }
    async optimizeDatabase() {
        try {
            const db = (0, connection_1.getDatabase)();
            await db.prepare('VACUUM').run();
            await db.prepare('ANALYZE').run();
            const reindexQueries = [
                'REINDEX tickets',
                'REINDEX services',
                'REINDEX devices'
            ];
            for (const query of reindexQueries) {
                try {
                    await db.prepare(query).run();
                }
                catch (err) {
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    async cleanupLogFiles() {
        try {
            const logsDirectory = path_1.default.resolve('logs');
            if (fs_1.default.existsSync(logsDirectory)) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - this.config.keepDays);
                const files = fs_1.default.readdirSync(logsDirectory);
                let deletedCount = 0;
                for (const file of files) {
                    const filePath = path_1.default.join(logsDirectory, file);
                    const stats = fs_1.default.statSync(filePath);
                    if (stats.mtime < cutoffDate) {
                        fs_1.default.unlinkSync(filePath);
                        deletedCount++;
                    }
                }
            }
        }
        catch (error) {
        }
    }
    async cleanDirectory(dirPath, extension) {
        let deletedCount = 0;
        try {
            if (!fs_1.default.existsSync(dirPath)) {
                return deletedCount;
            }
            const files = fs_1.default.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path_1.default.join(dirPath, file);
                const stats = fs_1.default.statSync(filePath);
                if (stats.isFile()) {
                    if (!extension || file.endsWith(extension)) {
                        fs_1.default.unlinkSync(filePath);
                        deletedCount++;
                    }
                }
                else if (stats.isDirectory()) {
                    deletedCount += await this.cleanDirectory(filePath, extension);
                    try {
                        fs_1.default.rmdirSync(filePath);
                    }
                    catch (err) {
                    }
                }
            }
        }
        catch (error) {
        }
        return deletedCount;
    }
    notifyClientsOfReset() {
        try {
            const { getSocketIO } = require('./socketInstance');
            const { broadcastSystemReset } = require('../sockets/socketHandlers');
            const io = getSocketIO();
            if (io) {
                broadcastSystemReset(io);
            }
            else {
            }
        }
        catch (error) {
        }
    }
    async performManualReset() {
        await this.forceImmediateReset();
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getResetStatus() {
        return {
            config: this.config,
            enabled: this.config.enabled
        };
    }
    async initializeDailyResetTable() {
        try {
            const db = (0, connection_1.getDatabase)();
            await db.prepare(`
        CREATE TABLE IF NOT EXISTS daily_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          last_reset_date TEXT NOT NULL UNIQUE,
          last_reset_timestamp TEXT NOT NULL,
          tickets_reset INTEGER DEFAULT 0,
          pdfs_reset INTEGER DEFAULT 0,
          cache_reset INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
        }
        catch (error) {
            throw error;
        }
    }
    async needsDailyReset() {
        try {
            await this.initializeDailyResetTable();
            const db = (0, connection_1.getDatabase)();
            const today = new Date().toISOString().split('T')[0];
            const lastReset = db.prepare(`
        SELECT * FROM daily_resets
        WHERE last_reset_date = ?
        ORDER BY id DESC
        LIMIT 1
      `).get(today);
            if (!lastReset) {
                return true;
            }
            return false;
        }
        catch (error) {
            return true;
        }
    }
    async recordDailyReset() {
        try {
            const db = (0, connection_1.getDatabase)();
            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString();
            await db.prepare(`DELETE FROM daily_resets WHERE last_reset_date = ?`).run(today);
            await db.prepare(`
        INSERT INTO daily_resets (
          last_reset_date,
          last_reset_timestamp,
          tickets_reset,
          pdfs_reset,
          cache_reset
        ) VALUES (?, ?, ?, ?, ?)
      `).run(today, timestamp, this.config.resetTickets ? 1 : 0, this.config.resetPDFs ? 1 : 0, this.config.resetCache ? 1 : 0);
        }
        catch (error) {
            throw error;
        }
    }
    scheduleAutomaticReset() {
        if (!this.config.enabled) {
            return;
        }
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
        }
        const scheduleNextReset = () => {
            const now = new Date();
            const resetTimeParts = this.config.resetTime.split(':');
            const [resetHoursStr = '0', resetMinutesStr = '0'] = resetTimeParts;
            const resetHours = parseInt(resetHoursStr, 10) || 0;
            const resetMinutes = parseInt(resetMinutesStr, 10) || 0;
            const nextReset = new Date();
            nextReset.setHours(resetHours, resetMinutes, 0, 0);
            if (nextReset <= now) {
                nextReset.setDate(nextReset.getDate() + 1);
            }
            const timeUntilReset = nextReset.getTime() - now.getTime();
            setTimeout(async () => {
                try {
                    await this.performAutomaticDailyReset();
                }
                catch (error) {
                }
                scheduleNextReset();
            }, timeUntilReset);
        };
        scheduleNextReset();
        this.resetInterval = setInterval(async () => {
            try {
                const needsReset = await this.needsDailyReset();
                if (needsReset) {
                    await this.performAutomaticDailyReset();
                }
            }
            catch (error) {
            }
        }, 60 * 60 * 1000);
    }
    async performAutomaticDailyReset() {
        try {
            await this.performResetOnStartup();
        }
        catch (error) {
            throw error;
        }
    }
    async getLastResetInfo() {
        try {
            await this.initializeDailyResetTable();
            const db = (0, connection_1.getDatabase)();
            const lastReset = db.prepare(`
        SELECT * FROM daily_resets
        ORDER BY id DESC
        LIMIT 1
      `).get();
            return lastReset || null;
        }
        catch (error) {
            return null;
        }
    }
    async forceImmediateReset() {
        try {
            const db = (0, connection_1.getDatabase)();
            const today = new Date().toISOString().split('T')[0];
            await db.prepare(`DELETE FROM daily_resets WHERE last_reset_date = ?`).run(today);
        }
        catch (error) {
        }
        await this.performResetOnStartup();
    }
}
exports.dailyResetManager = new DailyResetManager();
exports.default = exports.dailyResetManager;
