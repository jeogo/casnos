import { useState, useCallback, useRef, useEffect } from 'react'

interface Service {
  id: number
  name: string
  created_at: string
}

interface AdminServicesState {
  services: Service[]
  isLoading: boolean
  error: string | null
  loadServices: () => Promise<void>
  createService: (name: string) => Promise<void>
  updateService: (id: number, name: string) => Promise<void>
  deleteService: (id: number) => Promise<void>
  clearError: () => void
}

/**
 * Admin Services Hook - مخصص للإدارة فقط
 * يستخدم window.api لاستخراج البيانات مباشرة من قاعدة البيانات
 */
export const useAdminServices = (): AdminServicesState => {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)

  // تحميل جميع الخدمات
  const loadServices = useCallback(async () => {
    if (isLoading || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log('[ADMIN-SERVICES] 📋 Loading all services...')

      const result = await window.api.getServices()

      if (result.success && result.data) {
        setServices(result.data)
        console.log('[ADMIN-SERVICES] ✅ Services loaded:', result.data.length)
      } else {
        throw new Error(result.error || 'Failed to load services')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading services'
      console.error('[ADMIN-SERVICES] ❌ Failed to load services:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [isLoading])

  // إنشاء خدمة جديدة
  const createService = useCallback(async (name: string) => {
    try {
      setError(null)
      console.log('[ADMIN-SERVICES] ➕ Creating service:', name)

      const result = await window.api.createService(name)

      if (result.success) {
        console.log('[ADMIN-SERVICES] ✅ Service created successfully')
        // إعادة تحميل القائمة
        await loadServices()
      } else {
        throw new Error(result.error || 'Failed to create service')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating service'
      console.error('[ADMIN-SERVICES] ❌ Failed to create service:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadServices])

  // تحديث خدمة
  const updateService = useCallback(async (id: number, name: string) => {
    try {
      setError(null)
      console.log('[ADMIN-SERVICES] ✏️ Updating service:', id, name)

      const result = await window.api.updateService(id, name)

      if (result.success) {
        console.log('[ADMIN-SERVICES] ✅ Service updated successfully')
        // إعادة تحميل القائمة
        await loadServices()
      } else {
        throw new Error(result.error || 'Failed to update service')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error updating service'
      console.error('[ADMIN-SERVICES] ❌ Failed to update service:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadServices])

  // حذف خدمة
  const deleteService = useCallback(async (id: number) => {
    try {
      setError(null)
      console.log('[ADMIN-SERVICES] 🗑️ Deleting service:', id)

      const result = await window.api.deleteService(id)

      if (result.success) {
        console.log('[ADMIN-SERVICES] ✅ Service deleted successfully')
        // إعادة تحميل القائمة
        await loadServices()
      } else {
        throw new Error(result.error || 'Failed to delete service')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error deleting service'
      console.error('[ADMIN-SERVICES] ❌ Failed to delete service:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [loadServices])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    loadingRef.current = false
  }, [])

  // تحميل البيانات عند بداية التشغيل
  useEffect(() => {
    if (services.length === 0 && !isLoading && !loadingRef.current) {
      loadServices()
    }
  }, [])

  return {
    services,
    isLoading,
    error,
    loadServices,
    createService,
    updateService,
    deleteService,
    clearError
  }
}
