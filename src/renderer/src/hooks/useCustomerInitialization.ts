import { useState, useEffect, useCallback, useRef } from 'react'
import { useServerConnection } from './useServerConnection'

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

interface CustomerInitializationState {
  // Overall state
  isInitialized: boolean
  isInitializing: boolean
  initializationError: string | null

  // Step indicators
  steps: {
    discovery: StepStatus
    socket: StepStatus
    registration: StepStatus
  }

  // Server connection data
  serverConnection: ReturnType<typeof useServerConnection>

  // Actions
  initialize: () => Promise<void>
  retry: () => Promise<void>
  clearError: () => void
}

/**
 * Hook رئيسي لإدارة تهيئة شاشة العملاء بالترتيب الصحيح
 * Customer Screen Initialization Hook
 *
 * التدفق المطلوب:
 * 1. UDP Discovery - اكتشاف الخادم
 * 2. Socket Connection - الاتصال المباشر
 * 3. Device Registration - تسجيل الجهاز
 * 4. Ready - جاهز لتحميل الخدمات والطابعات
 */
export const useCustomerInitialization = (): CustomerInitializationState => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  const [steps, setSteps] = useState<{
    discovery: StepStatus
    socket: StepStatus
    registration: StepStatus
  }>({
    discovery: 'pending',
    socket: 'pending',
    registration: 'pending'
  })

  // إضافة ref لمنع تعدد الاستدعاءات
  const initializingRef = useRef(false)

  // استخدام useServerConnection الذي يدير كل الخطوات
  const serverConnection = useServerConnection()

  // مراقبة تقدم التهيئة
  useEffect(() => {
    // تحديث خطوة Discovery
    if (serverConnection.isDiscovering) {
      setSteps(prev => ({ ...prev, discovery: 'in-progress' }))
    } else if (serverConnection.serverInfo && !serverConnection.discoveryError) {
      setSteps(prev => ({ ...prev, discovery: 'completed' }))
    } else if (serverConnection.discoveryError) {
      setSteps(prev => ({ ...prev, discovery: 'failed' }))
    }

    // تحديث خطوة Socket Connection
    if (serverConnection.isConnecting) {
      setSteps(prev => ({ ...prev, socket: 'in-progress' }))
    } else if (serverConnection.isConnected && !serverConnection.connectionError) {
      setSteps(prev => ({ ...prev, socket: 'completed' }))
    } else if (serverConnection.connectionError) {
      setSteps(prev => ({ ...prev, socket: 'failed' }))
    }

    // تحديث خطوة Device Registration
    if (serverConnection.isRegistering) {
      setSteps(prev => ({ ...prev, registration: 'in-progress' }))
    } else if (serverConnection.isRegistered && !serverConnection.registrationError) {
      setSteps(prev => ({ ...prev, registration: 'completed' }))
    } else if (serverConnection.registrationError) {
      setSteps(prev => ({ ...prev, registration: 'failed' }))
    }
  }, [
    serverConnection.isDiscovering,
    serverConnection.serverInfo,
    serverConnection.discoveryError,
    serverConnection.isConnecting,
    serverConnection.isConnected,
    serverConnection.connectionError,
    serverConnection.isRegistering,
    serverConnection.isRegistered,
    serverConnection.registrationError
  ])

  // تحديد حالة التهيئة الإجمالية
  useEffect(() => {
    const allCompleted = steps.discovery === 'completed' &&
                        steps.socket === 'completed' &&
                        steps.registration === 'completed'

    const anyFailed = steps.discovery === 'failed' ||
                     steps.socket === 'failed' ||
                     steps.registration === 'failed'

    const anyInProgress = steps.discovery === 'in-progress' ||
                         steps.socket === 'in-progress' ||
                         steps.registration === 'in-progress'

    if (allCompleted && !isInitialized) {
      setIsInitialized(true)
      setIsInitializing(false)
      setInitializationError(null)
    } else if (anyFailed && !initializationError) {
      const error = serverConnection.discoveryError ||
                   serverConnection.connectionError ||
                   serverConnection.registrationError ||
                   'Unknown initialization error'
      setInitializationError(error)
      setIsInitializing(false)
    } else if (anyInProgress && !isInitializing) {
      setIsInitializing(true)
    }
  }, [steps, isInitialized, isInitializing, initializationError, serverConnection])

  // بدء التهيئة
  const initialize = useCallback(async () => {
    // منع التكرار باستخدام ref
    if (isInitializing || initializingRef.current) {
      return
    }

    try {
      // تعيين refs لمنع التكرار
      initializingRef.current = true

      // إعادة تعيين الحالة
      setIsInitialized(false)
      setIsInitializing(true)
      setInitializationError(null)
      setSteps({
        discovery: 'pending',
        socket: 'pending',
        registration: 'pending'
      })

      // بدء عملية التهيئة الكاملة
      await serverConnection.initialize('customer')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization'
      setInitializationError(errorMessage)
      setIsInitializing(false)
    } finally {
      // إعادة تعيين ref بعد انتهاء العملية
      initializingRef.current = false
    }
  }, [serverConnection, isInitializing])

  // إعادة المحاولة
  const retry = useCallback(async () => {
    await initialize()
  }, [initialize])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setInitializationError(null)
    serverConnection.clearErrors()
  }, [serverConnection])

  // بدء التهيئة تلقائياً عند تحميل الـ hook (مع منع التكرار)
  useEffect(() => {
    // شروط بدء التهيئة:
    // 1. غير مهيأ بالفعل
    // 2. ليس في حالة تهيئة
    // 3. لا يوجد خطأ سابق
    // 4. لا يتم التهيئة حالياً (ref check)
    if (!isInitialized && !isInitializing && !initializationError && !initializingRef.current) {
      initialize()
    }
  }, []) // فقط عند التحميل الأول - لا نضيف dependencies أخرى لمنع re-run

  return {
    // Overall state
    isInitialized,
    isInitializing,
    initializationError,

    // Step indicators
    steps,

    // Server connection
    serverConnection,

    // Actions
    initialize,
    retry,
    clearError
  }
}
