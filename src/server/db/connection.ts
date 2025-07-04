import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'queue.db')

let db: Database.Database

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true })
}

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
