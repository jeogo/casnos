// Daily reset utility for queue system
import type Database from 'better-sqlite3'

/**
 * Setup daily reset system
 */
export function setupDailyReset(db: Database.Database): void {
  try {
    console.log('🔄 Setting up daily reset system...')

    // Initialize daily reset tracking table if not exists
    initializeDailyResetTable(db)

    // Perform reset if needed
    performDailyResetIfNeeded(db)

    console.log('✅ Daily reset system initialized')
  } catch (error) {
    console.error('❌ Daily reset setup failed:', error)
    throw error
  }
}

/**
 * Initialize daily reset tracking table
 */
function initializeDailyResetTable(db: Database.Database): void {
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
  `)
}

/**
 * Perform daily reset if needed
 */
function performDailyResetIfNeeded(db: Database.Database): void {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Check if reset has already been performed today
    const lastReset = db.prepare('SELECT last_reset_date FROM daily_resets WHERE last_reset_date = ?').get(today)

    if (!lastReset) {
      console.log('🔄 Performing daily reset...')

      // Count tickets to be reset
      const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }

      // Clear all tickets
      db.exec('DELETE FROM tickets')

      // Reset autoincrement sequence
      db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'")

      // Record the reset
      const stmt = db.prepare(`
        INSERT INTO daily_resets (last_reset_date, last_reset_timestamp, tickets_reset)
        VALUES (?, ?, ?)
      `)
      stmt.run(today, new Date().toISOString(), ticketCount.count)

      console.log(`✅ Daily reset completed - ${ticketCount.count} tickets cleared`)
    } else {
      console.log('✅ Daily reset already performed today')
    }
  } catch (error) {
    console.error('❌ Daily reset failed:', error)
    // Don't throw here to allow application to start even if reset fails
  }
}

/**
 * Manual reset function (for admin use)
 */
export function performManualReset(db: Database.Database): {
  success: boolean
  ticketsCleared: number
  message: string
} {
  try {
    // Count current tickets
    const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }

    // Clear all tickets
    db.exec('DELETE FROM tickets')

    // Reset autoincrement sequence
    db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'")

    // Record manual reset
    const today = new Date().toISOString().split('T')[0]
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_resets (last_reset_date, last_reset_timestamp, tickets_reset)
      VALUES (?, ?, ?)
    `)
    stmt.run(today, new Date().toISOString(), ticketCount.count)

    return {
      success: true,
      ticketsCleared: ticketCount.count,
      message: `Manual reset completed - ${ticketCount.count} tickets cleared`
    }
  } catch (error) {
    console.error('Manual reset failed:', error)
    return {
      success: false,
      ticketsCleared: 0,
      message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get reset history
 */
export function getResetHistory(db: Database.Database): Array<{
  id: number
  date: string
  timestamp: string
  tickets_reset: number
  created_at: string
}> {
  try {
    const stmt = db.prepare(`
      SELECT * FROM daily_resets
      ORDER BY last_reset_date DESC
      LIMIT 30
    `)
    return stmt.all() as Array<{
      id: number
      date: string
      timestamp: string
      tickets_reset: number
      created_at: string
    }>
  } catch (error) {
    console.error('Error getting reset history:', error)
    return []
  }
}

/**
 * Check if reset is needed
 */
export function isResetNeeded(db: Database.Database): boolean {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastReset = db.prepare('SELECT last_reset_date FROM daily_resets WHERE last_reset_date = ?').get(today)
    return !lastReset
  } catch (error) {
    console.error('Error checking reset status:', error)
    return false
  }
}
