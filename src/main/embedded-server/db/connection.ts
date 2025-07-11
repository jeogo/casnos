import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// ✅ Use unified AppData storage approach (same as main server)
let DB_DIR: string;
let DB_PATH: string;

try {
  // Try to get AppData path for unified storage
  const { app } = require('electron');
  if (app && app.getPath) {
    const appDataPath = app.getPath('userData');
    DB_DIR = join(appDataPath, 'data');
    DB_PATH = join(DB_DIR, 'queue.db');
    console.log(`[Embedded-Database] 📁 Using AppData path: ${DB_DIR}`);
  } else {
    throw new Error('Electron app not available');
  }
} catch (error) {
  // Fallback to current directory
  console.log('[Embedded-Database] 🔄 Using fallback directory...');
  DB_DIR = join(process.cwd(), 'data');
  DB_PATH = join(DB_DIR, 'queue.db');
  console.log(`[Embedded-Database] 📁 Using fallback path: ${DB_DIR}`);
}

let db: Database.Database

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true })
  console.log(`[Embedded-Database] ✅ Created data directory: ${DB_DIR}`)
}

console.log(`[Embedded-Database] 📁 Final database path: ${DB_PATH}`);

export function initializeConnection(): Database.Database {
  if (!db) {
    try {
      console.log('🗄️ Initializing database connection...')

      db = new Database(DB_PATH)

      // Enable WAL mode for better concurrent access
      db.pragma('journal_mode = WAL')
      db.pragma('synchronous = NORMAL')
      db.pragma('cache_size = 1000')
      db.pragma('temp_store = memory')

      // Schema creation will be handled by the main database initialization
      console.log('✅ Database connection initialized successfully')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeConnection() first.')
  }
  return db
}

export function closeConnection(): void {
  if (db) {
    db.close()
    console.log('�️ Database connection closed')
  }
}

/**
 * Health check for database
 */
export function checkDatabaseHealth(): boolean {
  try {
    if (!db) return false

    // Simple query to check if database is accessible
    const result = db.prepare('SELECT 1 as test').get() as { test: number }
    return result && result.test === 1
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
