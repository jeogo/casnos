import { getDatabase } from '../connection'

interface DailyResetRecord {
  id?: number
  last_reset_date: string
  last_reset_timestamp: string
  tickets_reset: boolean
  pdfs_reset: boolean
  cache_reset: boolean
}

export const systemOperations = {
  // Daily Reset Operations
  getLastReset: (): DailyResetRecord | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM daily_resets
      ORDER BY last_reset_timestamp DESC
      LIMIT 1
    `)
    return stmt.get() as DailyResetRecord | undefined
  },

  getResetByDate: (date: string): DailyResetRecord | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM daily_resets WHERE last_reset_date = ?')
    return stmt.get(date) as DailyResetRecord | undefined
  },

  createResetRecord: (record: Omit<DailyResetRecord, 'id'>): DailyResetRecord => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO daily_resets (
        last_reset_date, last_reset_timestamp,
        tickets_reset, pdfs_reset, cache_reset
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `)

    return stmt.get(
      record.last_reset_date,
      record.last_reset_timestamp,
      record.tickets_reset ? 1 : 0,
      record.pdfs_reset ? 1 : 0,
      record.cache_reset ? 1 : 0
    ) as DailyResetRecord
  },

  updateResetRecord: (date: string, updates: Partial<DailyResetRecord>): DailyResetRecord | undefined => {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.last_reset_timestamp !== undefined) {
      fields.push('last_reset_timestamp = ?')
      values.push(updates.last_reset_timestamp)
    }
    if (updates.tickets_reset !== undefined) {
      fields.push('tickets_reset = ?')
      values.push(updates.tickets_reset ? 1 : 0)
    }
    if (updates.pdfs_reset !== undefined) {
      fields.push('pdfs_reset = ?')
      values.push(updates.pdfs_reset ? 1 : 0)
    }
    if (updates.cache_reset !== undefined) {
      fields.push('cache_reset = ?')
      values.push(updates.cache_reset ? 1 : 0)
    }

    if (fields.length === 0) return undefined

    values.push(date)

    const stmt = db.prepare(`
      UPDATE daily_resets SET ${fields.join(', ')}
      WHERE last_reset_date = ?
      RETURNING *
    `)

    return stmt.get(...values) as DailyResetRecord | undefined
  },

  needsReset: (): boolean => {
    const today = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10)
    const lastReset = systemOperations.getResetByDate(today)
    return !lastReset
  },

  performTicketReset: (): void => {
    const db = getDatabase()

    // Clear tickets table
    db.exec('DELETE FROM tickets')

    // Reset autoincrement sequence
    db.exec("DELETE FROM sqlite_sequence WHERE name='tickets'")

    console.log('✅ Ticket reset completed')
  },

  // System Statistics
  getDatabaseStats: () => {
    const db = getDatabase()

    // Get table sizes
    const tables = ['services', 'tickets', 'windows', 'devices', 'device_printers', 'daily_resets']
    const stats: Record<string, number> = {}

    for (const table of tables) {
      try {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
        const result = stmt.get() as { count: number }
        stats[table] = result.count
      } catch (error) {
        stats[table] = 0
      }
    }

    return {
      tables: stats,
      totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
      timestamp: new Date().toISOString()
    }
  },

  // Database Maintenance
  vacuum: (): void => {
    const db = getDatabase()
    db.exec('VACUUM')
    console.log('✅ Database vacuum completed')
  },

  analyze: (): void => {
    const db = getDatabase()
    db.exec('ANALYZE')
    console.log('✅ Database analyze completed')
  },

  // System Health Check
  healthCheck: () => {
    const db = getDatabase()

    try {
      // Test basic connectivity
      const testQuery = db.prepare('SELECT 1 as test')
      const result = testQuery.get() as { test: number }

      if (result.test !== 1) {
        throw new Error('Database connectivity test failed')
      }

      // Get database info
      const pragma = {
        journal_mode: db.pragma('journal_mode', { simple: true }),
        synchronous: db.pragma('synchronous', { simple: true }),
        cache_size: db.pragma('cache_size', { simple: true }),
        page_size: db.pragma('page_size', { simple: true }),
        page_count: db.pragma('page_count', { simple: true })
      }

      return {
        status: 'healthy',
        pragma,
        stats: systemOperations.getDatabaseStats(),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }
}
