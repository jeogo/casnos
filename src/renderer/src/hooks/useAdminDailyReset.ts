import { useState, useCallback, useRef } from 'react'

interface DailyResetStatus {
  lastReset: string | null
  nextScheduledReset: string | null
  isEnabled: boolean
  inProgress: boolean
}

interface DailyResetStatistics {
  totalResets: number
  lastResetDate: string | null
  deletedTicketsCount: number
  deletedPdfsCount: number
  clearedCacheSize: number
}

interface DailyResetConfig {
  scheduledTime: string // HH:MM format
  isEnabled: boolean
  autoDeleteTickets: boolean
  autoDeletePdfs: boolean
  autoClearCache: boolean
}

interface AdminDailyResetState {
  status: DailyResetStatus | null
  statistics: DailyResetStatistics | null
  config: DailyResetConfig | null
  isLoading: boolean
  error: string | null
  loadStatus: () => Promise<void>
  loadStatistics: () => Promise<void>
  loadConfig: () => Promise<void>
  forceDailyReset: () => Promise<void>
  updateConfig: (config: Partial<DailyResetConfig>) => Promise<void>
  clearError: () => void
}

/**
 * Admin Daily Reset Hook - للتحكم في إعادة تعيين النظام اليومي
 */
export const useAdminDailyReset = (): AdminDailyResetState => {
  const [status, setStatus] = useState<DailyResetStatus | null>(null)
  const [statistics, setStatistics] = useState<DailyResetStatistics | null>(null)
  const [config, setConfig] = useState<DailyResetConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)

  // تحميل حالة إعادة التعيين اليومي
  const loadStatus = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-DAILY-RESET] 📊 Loading daily reset status...')

      const result = await window.api.getDailyResetStatus()

      if (result.success && result.data) {
        setStatus(result.data)
        console.log('[ADMIN-DAILY-RESET] ✅ Status loaded:', result.data)
      } else {
        throw new Error(result.error || 'Failed to load daily reset status')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load status'
      console.error('[ADMIN-DAILY-RESET] ❌ Error loading status:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // تحميل إحصائيات إعادة التعيين اليومي
  const loadStatistics = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-DAILY-RESET] 📈 Loading daily reset statistics...')

      const result = await window.api.getDailyResetStatistics()

      if (result.success && result.data) {
        setStatistics(result.data)
        console.log('[ADMIN-DAILY-RESET] ✅ Statistics loaded:', result.data)
      } else {
        throw new Error(result.error || 'Failed to load daily reset statistics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics'
      console.error('[ADMIN-DAILY-RESET] ❌ Error loading statistics:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // تحميل إعدادات إعادة التعيين اليومي
  const loadConfig = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-DAILY-RESET] ⚙️ Loading daily reset config...')

      const result = await window.api.getDailyResetStatistics()

      if (result.success && result.data) {
        setConfig(result.data)
        console.log('[ADMIN-DAILY-RESET] ✅ Config loaded:', result.data)
      } else {
        throw new Error(result.error || 'Failed to load daily reset config')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load config'
      console.error('[ADMIN-DAILY-RESET] ❌ Error loading config:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // تشغيل إعادة التعيين اليومي بشكل فوري
  const forceDailyReset = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-DAILY-RESET] 🔄 Forcing daily reset...')

      const result = await window.api.forceDailyReset()

      if (result.success) {
        console.log('[ADMIN-DAILY-RESET] ✅ Daily reset completed successfully')
        // إعادة تحميل البيانات بعد إعادة التعيين
        await Promise.all([loadStatus(), loadStatistics()])
      } else {
        throw new Error(result.error || 'Failed to force daily reset')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to force reset'
      console.error('[ADMIN-DAILY-RESET] ❌ Error forcing reset:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading, loadStatus, loadStatistics])

  // تحديث إعدادات إعادة التعيين اليومي
  const updateConfig = useCallback(async (newConfig: Partial<DailyResetConfig>) => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-DAILY-RESET] 🔧 Updating daily reset config:', newConfig)

      const result = await window.api.updateDailyResetConfig(newConfig)

      if (result.success && result.data) {
        setConfig(result.data)
        console.log('[ADMIN-DAILY-RESET] ✅ Config updated successfully')
      } else {
        throw new Error(result.error || 'Failed to update daily reset config')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update config'
      console.error('[ADMIN-DAILY-RESET] ❌ Error updating config:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    status,
    statistics,
    config,
    isLoading,
    error,
    loadStatus,
    loadStatistics,
    loadConfig,
    forceDailyReset,
    updateConfig,
    clearError
  }
}
