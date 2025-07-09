"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeConnection = initializeConnection;
exports.getDatabase = getDatabase;
exports.closeConnection = closeConnection;
exports.checkDatabaseHealth = checkDatabaseHealth;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = require("fs");
const pathUtils_1 = require("../../shared/pathUtils");
const paths = (0, pathUtils_1.getCASNOSPaths)();
const DB_DIR = paths.dataPath;
const DB_PATH = paths.databasePath;
let db;
if (!(0, fs_1.existsSync)(DB_DIR)) {
    (0, fs_1.mkdirSync)(DB_DIR, { recursive: true });
    console.log(`[Database] ✅ Created data directory: ${DB_DIR}`);
}
console.log(`[Database] 📁 Using database path: ${DB_PATH}`);
function initializeConnection() {
    if (!db) {
        try {
            console.log('🗄️ Initializing database connection...');
            db = new better_sqlite3_1.default(DB_PATH);
            db.pragma('journal_mode = WAL');
            db.pragma('synchronous = NORMAL');
            db.pragma('cache_size = 1000');
            db.pragma('temp_store = memory');
            console.log('✅ Database connection initialized successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }
    return db;
}
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeConnection() first.');
    }
    return db;
}
function closeConnection() {
    if (db) {
        db.close();
        console.log('�️ Database connection closed');
    }
}
function checkDatabaseHealth() {
    try {
        if (!db)
            return false;
        const result = db.prepare('SELECT 1 as test').get();
        return result && result.test === 1;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
