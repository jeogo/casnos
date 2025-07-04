// 🎯 Complete IPC Handlers - معالجات IPC الشاملة
import { setupPrintHandlers } from './printHandlers'
import { setupAudioHandlers } from './audioHandlers'
import { setupVideoHandlers } from './videoHandlers'
import { setupNetworkHandlers } from './networkHandlers'
import { setupAPIHandlers } from './apiHandlers'
import { setupSocketHandlers } from './socketHandlers'

/**
 * تسجيل جميع المعالجات الشاملة
 */
export function registerEssentialHandlers(): void {
  console.log('[HANDLERS] 🚀 Registering all handlers...')

  try {
    // Core handlers
    setupPrintHandlers()
    setupAudioHandlers()
    setupVideoHandlers()
    setupNetworkHandlers()

    // New comprehensive handlers
    setupAPIHandlers()
    setupSocketHandlers()

    console.log('[HANDLERS] ✅ All handlers registered successfully')
  } catch (error) {
    console.error('[HANDLERS] ❌ Error registering handlers:', error)
  }
}
