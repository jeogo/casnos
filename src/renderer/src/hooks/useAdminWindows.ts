import { useState, useCallback, useRef, useEffect } from 'react'

interface WindowData {
  id: number
  service_id?: number
  device_id?: string
  active: boolean
  device_connected?: boolean // Real device connection status
  created_at: string
  label?: string
}

interface AdminWindowsState {
  windows: WindowData[]
  isLoading: boolean
  error: string | null
  loadWindows: () => Promise<void>
  createWindow: () => Promise<void>
  updateWindow: (id: number, serviceId?: number, active?: boolean) => Promise<void>
  deleteWindow: (id: number) => Promise<void>
  assignService: (windowId: number, serviceId: number) => Promise<void>
  removeService: (windowId: number) => Promise<void>
  clearError: () => void
}

/**
 * Admin Windows Hook - مخصص للإدارة فقط
 * يستخدم window.api لاستخراج البيانات مباشرة من قاعدة البيانات
 */
export const useAdminWindows = (): AdminWindowsState => {
  const [windows, setWindows] = useState<WindowData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)

  // تحميل جميع النوافذ
  const loadWindows = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-WINDOWS] 🪟 Loading all windows...')

      const result = await window.api.getWindows()

      if (result.success && result.data) {
        console.log('[ADMIN-WINDOWS] 📊 Raw windows data from API:', JSON.stringify(result.data, null, 2))

        // Ensure active field is properly converted to boolean
        const processedWindows = result.data.map((window: any) => {
          const processed = {
            ...window,
            active: Boolean(window.active) // Convert 1/0 to true/false
          }
          console.log(`[ADMIN-WINDOWS] 🔄 Window ${window.id}: raw active=${window.active} (${typeof window.active}) -> processed active=${processed.active} (${typeof processed.active})`)
          return processed
        })

        console.log('[ADMIN-WINDOWS] 📊 Processed windows data:', JSON.stringify(processedWindows, null, 2))
        setWindows(processedWindows)
        console.log('[ADMIN-WINDOWS] ✅ Windows loaded:', result.data.length)
      } else {
        throw new Error(result.error || 'Failed to load windows')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading windows'
      console.error('[ADMIN-WINDOWS] ❌ Failed to load windows:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // إنشاء نافذة جديدة
  const createWindow = useCallback(async () => {
    try {
      setError(null)
      console.log('[ADMIN-WINDOWS] ➕ Creating new window...')

      const result = await window.api.createWindow()

      if (result.success) {
        console.log('[ADMIN-WINDOWS] ✅ Window created successfully')
        // إعادة تحميل القائمة
        await loadWindows()
      } else {
        throw new Error(result.error || 'Failed to create window')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating window'
      console.error('[ADMIN-WINDOWS] ❌ Failed to create window:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadWindows])

  // تحديث نافذة
  const updateWindow = useCallback(async (id: number, serviceId?: number, active?: boolean) => {
    try {
      setError(null)
      console.log('[ADMIN-WINDOWS] ✏️ Updating window:', id, { serviceId, active })
      console.log('[ADMIN-WINDOWS] 🔍 Active parameter type and value:', typeof active, active)

      // Optimistically update the local state immediately
      if (active !== undefined) {
        console.log('[ADMIN-WINDOWS] 🔄 Optimistically updating local state...')
        setWindows(prevWindows => {
          const updated = prevWindows.map(window =>
            window.id === id
              ? { ...window, active: Boolean(active), service_id: serviceId ?? window.service_id }
              : window
          )
          console.log('[ADMIN-WINDOWS] 📊 Updated local windows:', updated.find(w => w.id === id))
          return updated
        })
      }

      const result = await window.api.updateWindow(id, serviceId, active)
      console.log('[ADMIN-WINDOWS] � API response:', JSON.stringify(result, null, 2))

      if (result.success) {
        console.log('[ADMIN-WINDOWS] ✅ Window updated successfully')

        // Reload to confirm the update from server
        setTimeout(async () => {
          console.log('[ADMIN-WINDOWS] 🔄 Reloading data to confirm server state...')
          await loadWindows()
        }, 200)
      } else {
        // Revert optimistic update on failure
        console.log('[ADMIN-WINDOWS] ❌ Update failed, reverting optimistic changes...')
        await loadWindows()
        throw new Error(result.error || 'Failed to update window')
      }
    } catch (err) {
      // Revert optimistic update on error
      console.log('[ADMIN-WINDOWS] ❌ Error occurred, reverting optimistic changes...')
      await loadWindows()
      const errorMessage = err instanceof Error ? err.message : 'Unknown error updating window'
      console.error('[ADMIN-WINDOWS] ❌ Failed to update window:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadWindows])

  // حذف نافذة
  const deleteWindow = useCallback(async (id: number) => {
    try {
      setError(null)
      console.log('[ADMIN-WINDOWS] 🗑️ Deleting window:', id)

      const result = await window.api.deleteWindow(id)

      if (result.success) {
        console.log('[ADMIN-WINDOWS] ✅ Window deleted successfully')
        // إعادة تحميل القائمة
        await loadWindows()
      } else {
        throw new Error(result.error || 'Failed to delete window')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error deleting window'
      console.error('[ADMIN-WINDOWS] ❌ Failed to delete window:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadWindows])

  // تخصيص خدمة لنافذة
  const assignService = useCallback(async (windowId: number, serviceId: number) => {
    try {
      setError(null)
      console.log('[ADMIN-WINDOWS] 🔗 Assigning service to window:', windowId, serviceId)

      const result = await window.api.assignServiceToWindow(windowId, serviceId)

      if (result.success) {
        console.log('[ADMIN-WINDOWS] ✅ Service assigned successfully')
        // إعادة تحميل القائمة
        await loadWindows()
      } else {
        throw new Error(result.error || 'Failed to assign service')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error assigning service'
      console.error('[ADMIN-WINDOWS] ❌ Failed to assign service:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadWindows])

  // إزالة خدمة من نافذة
  const removeService = useCallback(async (windowId: number) => {
    try {
      setError(null)
      console.log('[ADMIN-WINDOWS] 🔗 Removing service from window:', windowId)

      const result = await window.api.removeServiceFromWindow(windowId)

      if (result.success) {
        console.log('[ADMIN-WINDOWS] ✅ Service removed successfully')
        // إعادة تحميل القائمة
        await loadWindows()
      } else {
        throw new Error(result.error || 'Failed to remove service')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error removing service'
      console.error('[ADMIN-WINDOWS] ❌ Failed to remove service:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadWindows])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    loadingRef.current = false
  }, [])

  // تحميل البيانات عند بداية التشغيل
  useEffect(() => {
    if (windows.length === 0 && !isLoading && !loadingRef.current) {
      loadWindows()
    }
  }, [])

  // 🔄 Listen for real-time window status updates
  useEffect(() => {
    if (typeof window !== 'undefined' && window.api?.onSocketEvent) {
      // Listen for window status updates from device connections
      const unsubscribeStatusUpdate = window.api.onSocketEvent('window:status-updated', (data: any) => {
        console.log('[ADMIN-WINDOWS] 🔄 Real-time window status update:', data)

        // Update the specific window in the local state
        setWindows(prevWindows =>
          prevWindows.map(w =>
            w.id === data.windowId
              ? { ...w, active: Boolean(data.active) }
              : w
          )
        )
      })

      // Listen for new windows created by device connections
      const unsubscribeWindowCreated = window.api.onSocketEvent('window:created', (data: any) => {
        console.log('[ADMIN-WINDOWS] ➕ Real-time window created:', data)
        loadWindows() // Reload the full list
      })

      // Cleanup listeners
      return () => {
        if (unsubscribeStatusUpdate) unsubscribeStatusUpdate()
        if (unsubscribeWindowCreated) unsubscribeWindowCreated()
      }
    }

    // Return empty cleanup function if conditions not met
    return () => {}
  }, [])

  return {
    windows,
    isLoading,
    error,
    loadWindows,
    createWindow,
    updateWindow,
    deleteWindow,
    assignService,
    removeService,
    clearError
  }
}
