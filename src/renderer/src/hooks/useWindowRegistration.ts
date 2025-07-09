import { useState, useCallback, useRef } from 'react'

interface WindowData {
  id: number
  service_id?: number
  device_id: string
  active: boolean
  created_at?: string
  updated_at?: string
  label?: string
}

interface UseWindowRegistrationReturn {
  // Window State
  windowData: WindowData | null
  isRegistering: boolean
  isRegistered: boolean
  registrationError: string | null

  // Actions
  registerWindow: (deviceId: string, serviceId?: number) => Promise<void>
  getWindow: (deviceId: string) => Promise<WindowData | null>
  activateWindow: (deviceId: string) => Promise<void>
  deactivateWindow: (deviceId: string) => Promise<void>

  // Utilities
  clearError: () => void
}

/**
 * Hook لإدارة تسجيل الشبابيك (Windows) للأجهزة
 * يدير التسجيل التلقائي للشباك وربطه بالجهاز
 */
export const useWindowRegistration = (): UseWindowRegistrationReturn => {
  const [windowData, setWindowData] = useState<WindowData | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  // منع التسجيل المكرر
  const registrationInProgress = useRef<Set<string>>(new Set())

  /**
   * الحصول على شباك الجهاز
   */
  const getWindow = useCallback(async (deviceId: string): Promise<WindowData | null> => {
    try {

      const result = await window.api.getWindowByDeviceId(deviceId)

      if (result.success && result.data) {
        const data = result.data as WindowData
        setWindowData(data)
        setIsRegistered(true)
        return data
      } else {
        setWindowData(null)
        setIsRegistered(false)
        return null
      }
    } catch (error) {
      console.error('[WINDOW-REGISTRATION] ❌ Error getting window:', error)
      setWindowData(null)
      setIsRegistered(false)
      return null
    }
  }, [])

  /**
   * تسجيل شباك للجهاز (التسجيل التلقائي)
   */
  const registerWindow = useCallback(async (deviceId: string, serviceId?: number) => {
    if (isRegistering) return

    // منع التسجيل المكرر للجهاز نفسه
    if (registrationInProgress.current.has(deviceId)) {
      return
    }

    setIsRegistering(true)
    setRegistrationError(null)
    registrationInProgress.current.add(deviceId)

    try {

      // 1. أولاً، التحقق من وجود شباك للجهاز
      const existingWindow = await getWindow(deviceId)

      if (existingWindow) {

        // تفعيل الشباك الموجود
        try {
          await activateWindow(deviceId)
        } catch (activationError) {
          console.warn('[WINDOW-REGISTRATION] ⚠️ Failed to activate existing window:', activationError)
          // استمر العملية حتى لو فشل التفعيل
        }
      } else {

        // إنشاء شباك جديد
        const result = await window.api.registerDeviceWindow(deviceId, serviceId)

        if (result.success && result.data) {
          const data = result.data as WindowData
          setWindowData(data)
          setIsRegistered(true)
        } else {
          throw new Error(result.error || 'Window registration failed')
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown registration error'
      setRegistrationError(errorMessage)
      setIsRegistered(false)
      setWindowData(null)
      console.error('[WINDOW-REGISTRATION] ❌ Window registration failed:', errorMessage)
      throw error
    } finally {
      registrationInProgress.current.delete(deviceId)
      setIsRegistering(false)
    }
  }, [isRegistering, getWindow])

  /**
   * تفعيل شباك للجهاز
   */
  const activateWindow = useCallback(async (deviceId: string) => {
    try {

      const result = await window.api.activateDeviceWindow(deviceId)

      if (result.success && result.data) {
        const data = result.data as WindowData
        setWindowData(data)
      } else {
        throw new Error(result.error || 'Window activation failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown activation error'
      console.error('[WINDOW-REGISTRATION] ❌ Window activation failed:', errorMessage)
      throw error
    }
  }, [])

  /**
   * إلغاء تفعيل شباك للجهاز
   */
  const deactivateWindow = useCallback(async (deviceId: string) => {
    try {
      console.log('[WINDOW-REGISTRATION] 🔴 Deactivating window for device:', deviceId)

      const result = await window.api.deactivateDeviceWindow(deviceId)

      if (result.success && result.data) {
        const data = result.data as WindowData
        setWindowData(data)
        console.log('[WINDOW-REGISTRATION] ✅ Window deactivated successfully:', data)
      } else {
        throw new Error(result.error || 'Window deactivation failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown deactivation error'
      console.error('[WINDOW-REGISTRATION] ❌ Window deactivation failed:', errorMessage)
      throw error
    }
  }, [])

  /**
   * مسح الأخطاء
   */
  const clearError = useCallback(() => {
    setRegistrationError(null)
  }, [])

  return {
    // Window State
    windowData,
    isRegistering,
    isRegistered,
    registrationError,

    // Actions
    registerWindow,
    getWindow,
    activateWindow,
    deactivateWindow,

    // Utilities
    clearError
  }
}
