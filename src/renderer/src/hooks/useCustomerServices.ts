import { useState, useCallback, useRef, useEffect } from 'react'

interface Service {
  id: number
  name: string
}

interface CustomerServicesState {
  // Services data
  services: Service[]

  // Loading states
  isLoading: boolean

  // Error states
  error: string | null

  // Actions
  loadServices: () => Promise<void>
  clearError: () => void
}

/**
 * Hook لإدارة الخدمات المتاحة للعملاء
 * Customer Services Management Hook
 *
 * يجب استخدام هذا الـ hook بعد اكتمال التهيئة فقط
 */
export const useCustomerServices = (isInitialized: boolean = false): CustomerServicesState => {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // منع التكرار في العمليات
  const loadingRef = useRef(false)

  // تحميل قائمة الخدمات المتاحة للعملاء
  const loadServices = useCallback(async () => {
    if (!isInitialized) {
      console.log('[CUSTOMER-SERVICES] ⏭️ System not initialized yet, skipping services load...')
      return
    }

    if (isLoading || loadingRef.current) {
      console.log('[CUSTOMER-SERVICES] ⏭️ Loading already in progress, skipping...')
      return
    }

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[CUSTOMER-SERVICES] 📋 Loading available services for customers...')

      const result = await window.api.getServices()

      if (result.success && result.data) {
        setServices(result.data)
        console.log('[CUSTOMER-SERVICES] ✅ Services loaded successfully:', result.data.length, 'services')
      } else {
        throw new Error(result.error || 'Failed to load services')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading services'
      console.error('[CUSTOMER-SERVICES] ❌ Failed to load services:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isInitialized, isLoading])

  // تحميل الخدمات تلقائياً بعد اكتمال التهيئة
  useEffect(() => {
    if (isInitialized && services.length === 0 && !isLoading && !loadingRef.current) {
      console.log('[CUSTOMER-SERVICES] 🚀 System initialized, auto-loading services...')
      loadServices()
    }
  }, [isInitialized, services.length, isLoading, loadServices])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    // إعادة تعيين المرجع في حالة وجود مشكلة
    loadingRef.current = false
  }, [])

  return {
    // State
    services,

    // Loading states
    isLoading,

    // Error states
    error,

    // Actions
    loadServices,
    clearError
  }
}
