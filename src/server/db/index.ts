// Database Main Entry Point
// Professional modular database system

import { initializeConnection, getDatabase, closeConnection } from './connection'
import { createAllSchemas } from './schemas'
import { systemOperations } from './operations'

// Export connection management
export { getDatabase, closeConnection as closeDatabase }

// Export all operations
export * from './operations'

// Export schema utilities
export { createAllSchemas } from './schemas'

/**
 * Initialize the complete database system
 * This function should be called once at application startup
 */
export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🚀 Initializing database system...')

      // 1. Initialize connection
      initializeConnection()

      // 2. Create all schemas
      createAllSchemas()

      // 3. Perform daily reset if needed
      performDailyResetIfNeeded()

      console.log('✅ Database system initialized successfully')

      // 4. Log system health
      const health = systemOperations.healthCheck()
      console.log('📊 Database health:', health.status)

      resolve()
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      reject(error)
    }
  })
}

/**
 * Perform daily reset if needed
 */
function performDailyResetIfNeeded(): void {
  try {
    if (systemOperations.needsReset()) {
      console.log('🔄 Performing daily reset...')

      const today: string = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10)
      const timestamp: string = new Date().toISOString()

      // Reset tickets
      systemOperations.performTicketReset()

      // Record the reset
      systemOperations.createResetRecord({
        last_reset_date: today,
        last_reset_timestamp: timestamp,
        tickets_reset: true,
        pdfs_reset: false, // Can be extended later
        cache_reset: false  // Can be extended later
      })

      console.log('✅ Daily reset completed')
    } else {
      console.log('ℹ️ Daily reset already performed today')
    }
  } catch (error) {
    console.error('❌ Daily reset failed:', error)
    // Don't throw - allow app to start even if reset fails
  }
}

/**
 * Graceful shutdown of database
 */
export function shutdownDatabase(): void {
  try {
    console.log('🔄 Shutting down database...')
    closeConnection()
    console.log('✅ Database shutdown complete')
  } catch (error) {
    console.error('❌ Database shutdown error:', error)
  }
}
