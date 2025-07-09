import { useState, useCallback, useRef } from 'react'

interface Service {
  id: number
  name: string
}

interface WindowServiceSetupState {
  // Service management
  services: Service[]
  selectedService: Service | null
  isServiceSet: boolean

  // Loading states
  isLoadingServices: boolean
  isSettingService: boolean

  // Error states
  servicesError: string | null
  setupError: string | null

  // Actions
  loadServices: () => Promise<void>
  setWindowService: (windowId: number, serviceId: number) => Promise<void>
  checkWindowService: (windowId: number) => Promise<Service | null>
  clearErrors: () => void
}

export const useWindowServiceSetup = (): WindowServiceSetupState => {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isServiceSet, setIsServiceSet] = useState(false)

  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [isSettingService, setIsSettingService] = useState(false)

  const [servicesError, setServicesError] = useState<string | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  // منع التكرار في العمليات
  const loadingRef = useRef(false)
  const checkingRef = useRef(false)
  const lastCheckedWindowId = useRef<number | null>(null) // cache للشباك الأخير المفحوص

  // تحميل قائمة الخدمات المتاحة
  const loadServices = useCallback(async () => {
    if (isLoadingServices || loadingRef.current) return

    try {
      loadingRef.current = true
      setIsLoadingServices(true)
      setServicesError(null)

      console.log('[WINDOW-SERVICE-SETUP] 📋 Loading available services...')

      const result = await window.api.getServices()

      if (result.success && result.data) {
        setServices(result.data)
        console.log('[WINDOW-SERVICE-SETUP] ✅ Services loaded:', result.data.length)
      } else {
        throw new Error(result.error || 'Failed to load services')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading services'
      console.error('[WINDOW-SERVICE-SETUP] ❌ Failed to load services:', errorMessage)
      setServicesError(errorMessage)
    } finally {
      setIsLoadingServices(false)
      loadingRef.current = false
    }
  }, [isLoadingServices])

  // فحص الخدمة المحددة للشباك
  const checkWindowService = useCallback(async (windowId: number): Promise<Service | null> => {
    if (checkingRef.current) {
      console.log('[WINDOW-SERVICE-SETUP] ⏭️ Check already in progress, skipping...')
      return null
    }

    // تجنب فحص نفس الشباك مرة أخرى إذا تم فحصه مؤخراً
    if (lastCheckedWindowId.current === windowId && isServiceSet && selectedService) {
      console.log('[WINDOW-SERVICE-SETUP] 📋 Using cached result for window:', windowId)
      return selectedService
    }

    try {
      checkingRef.current = true
      lastCheckedWindowId.current = windowId
      console.log('[WINDOW-SERVICE-SETUP] 🔍 Checking window service for window:', windowId)

      const result = await window.api.getWindowById(windowId)

      if (result.success && result.data && result.data.service_id) {
        // الشباك له خدمة محددة - جلب تفاصيل الخدمة
        const serviceResult = await window.api.getServiceById(result.data.service_id)

        if (serviceResult.success && serviceResult.data) {
          const service = serviceResult.data
          setSelectedService(service)
          setIsServiceSet(true)
          console.log('[WINDOW-SERVICE-SETUP] ✅ Window has service:', service.name)
          return service
        }
      }

      // الشباك ليس له خدمة محددة
      console.log('[WINDOW-SERVICE-SETUP] ⚪ Window has no service assigned')
      setIsServiceSet(false)
      return null
    } catch (error) {
      console.error('[WINDOW-SERVICE-SETUP] ❌ Error checking window service:', error)
      return null
    } finally {
      checkingRef.current = false
    }
  }, [isServiceSet, selectedService])

  // تحديد خدمة للشباك بشكل دائم
  const setWindowService = useCallback(async (windowId: number, serviceId: number) => {
    if (isSettingService) return

    try {
      setIsSettingService(true)
      setSetupError(null)

      console.log('[WINDOW-SERVICE-SETUP] 🏢 Setting service', serviceId, 'for window', windowId)

      // ربط الخدمة بالشباك في قاعدة البيانات
      const result = await window.api.assignServiceToWindow(windowId, serviceId)

      if (result.success && result.data) {
        // جلب تفاصيل الخدمة المحددة
        const service = services.find(s => s.id === serviceId)
        if (service) {
          setSelectedService(service)
          setIsServiceSet(true)
          console.log('[WINDOW-SERVICE-SETUP] ✅ Service set successfully:', service.name)
        }
      } else {
        throw new Error(result.error || 'Failed to set window service')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error setting service'
      console.error('[WINDOW-SERVICE-SETUP] ❌ Failed to set window service:', errorMessage)
      setSetupError(errorMessage)
    } finally {
      setIsSettingService(false)
    }
  }, [isSettingService, services])

  // مسح الأخطاء
  const clearErrors = useCallback(() => {
    setServicesError(null)
    setSetupError(null)
    // إعادة تعيين المراجع في حالة وجود مشكلة
    loadingRef.current = false
    checkingRef.current = false
  }, [])

  return {
    // State
    services,
    selectedService,
    isServiceSet,

    // Loading states
    isLoadingServices,
    isSettingService,

    // Error states
    servicesError,
    setupError,

    // Actions
    loadServices,
    setWindowService,
    checkWindowService,
    clearErrors
  }
}
