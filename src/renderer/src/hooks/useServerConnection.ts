import { useUdpDiscovery } from './useUdpDiscovery'
import { useSocketConnection } from './useSocketConnection'
import { useDeviceRegistration } from './useDeviceRegistration'
import { getDeviceInfo } from '../utils/deviceInfo'
import { useCallback, useEffect, useRef } from 'react'

interface DeviceInfo {
  device_id: string
  name: string
  device_type: 'customer' | 'display' | 'window' | 'admin'
  ip_address?: string
}

export type { DeviceInfo }

interface UseServerConnectionReturn {
  // Discovery
  isDiscovering: boolean
  serverInfo: any
  discoveryError: string | null

  // Connection
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  socketId: string | null

  // Device Registration
  isRegistered: boolean
  isRegistering: boolean
  registrationError: string | null
  device: any | null
  deviceInfo: DeviceInfo | null

  // Actions
  initialize: (deviceType: 'customer' | 'display' | 'window' | 'admin') => Promise<void>
  reconnect: () => Promise<void>
  disconnect: () => Promise<void>

  // Socket Events
  emit: (event: string, data?: any) => Promise<void>
  onEvent: (event: string, callback: Function) => () => void

  // Utilities
  clearErrors: () => void
  isReady: boolean
}

/**
 * Hook رئيسي لإدارة الاتصال الكامل مع الخادم
 * يجمع UDP Discovery + Device Registration + Socket Connection
 */
export const useServerConnection = (): UseServerConnectionReturn => {
  // منع التكرار في العمليات
  const initializingRef = useRef(false)

  // UDP Discovery
  const {
    isDiscovering,
    serverInfo,
    error: discoveryError,
    discoverServer,
    clearError: clearDiscoveryError
  } = useUdpDiscovery()

  // Device Registration
  const {
    isRegistered,
    isRegistering,
    registrationError,
    device,
    deviceInfo,
    registerDevice,
    checkRegistration,
    updateDeviceStatus,
    clearError: clearRegistrationError
  } = useDeviceRegistration()

  // Socket Connection
  const {
    isConnected,
    isConnecting,
    connectionError,
    socketId,
    connect,
    disconnect,
    emit,
    onEvent,
    clearError: clearConnectionError
  } = useSocketConnection()  // تحديد ما إذا كان النظام جاهز للعمل
  // System ready state - معتمد على Socket Connection بدلاً من Registration
  const isReady = Boolean(isConnected && serverInfo && !discoveryError && !connectionError)

  /**
   * اكتشاف الخادم مع إعادة المحاولة
   */
  const discoverServerWithRetry = useCallback(async (maxRetries = 3): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SERVER-CONNECTION] � Discovery attempt ${attempt}/${maxRetries}...`)

        if (!serverInfo) {
          await discoverServer()
        }

        // التحقق من النتيجة
        const saved = await window.api.getServerInfo()
        if (saved?.ip && saved?.port) {
          console.log('[SERVER-CONNECTION] ✅ Server discovered:', saved)
          return saved
        }

        if (attempt < maxRetries) {
          console.log(`[SERVER-CONNECTION] ⏳ Discovery attempt ${attempt} failed, retrying in 3 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      } catch (error) {
        console.error(`[SERVER-CONNECTION] ❌ Discovery attempt ${attempt} failed:`, error)
        if (attempt < maxRetries) {
          console.log(`[SERVER-CONNECTION] ⏳ Retrying discovery in 3 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }
    }

    throw new Error('Server discovery failed after all attempts')
  }, [serverInfo, discoverServer])

  /**
   * تهيئة الاتصال الكامل - النسخة الجديدة المحسنة
   * 1. UDP Discovery لإيجاد الخادم أولاً (مع إعادة المحاولة)
   * 2. Socket Connection مباشرة للتحديثات الفورية
   * 3. التحقق من وجود الجهاز في الخلفية
   * 4. تسجيل الجهاز فقط إذا لم يكن موجود (في الخلفية)
   */
  const initialize = useCallback(async (deviceType: 'customer' | 'display' | 'window' | 'admin') => {
    // منع التكرار باستخدام ref
    if (initializingRef.current) {
      console.log('[SERVER-CONNECTION] ⏭️ Initialization already in progress, skipping...')
      return
    }

    try {
      console.log('[SERVER-CONNECTION] 🚀 Initializing connection for:', deviceType)
      initializingRef.current = true

      // تخطي إذا كان متصل بالفعل وكل شيء جاهز
      if (isConnected && serverInfo) {
        console.log('[SERVER-CONNECTION] ✅ Already connected and ready, skipping initialization')
        return
      }

      // 1. اكتشاف الخادم مع إعادة المحاولة
      const currentServerInfo = serverInfo || await discoverServerWithRetry()
      const serverUrl = `http://${currentServerInfo.ip}:${currentServerInfo.port}`

      // 2. إنشاء device info فوراً للاتصال
      const tempDeviceInfo = await getDeviceInfo(deviceType)

      // 3. الاتصال بـ Socket مباشرة (لا ننتظر التسجيل)
      if (!isConnected) {
        console.log('[SERVER-CONNECTION] 🔌 Connecting to socket immediately:', serverUrl)
        await connect(serverUrl, tempDeviceInfo)
        console.log('[SERVER-CONNECTION] ✅ Socket connected successfully')
      } else {
        console.log('[SERVER-CONNECTION] ✅ Socket already connected')
      }

      // 4. التحقق والتسجيل في الخلفية (لا يوقف العملية)
      checkAndRegisterDeviceInBackground(deviceType, tempDeviceInfo)

      console.log('[SERVER-CONNECTION] ✅ Connection initialized successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error'
      console.error('[SERVER-CONNECTION] ❌ Initialization failed:', errorMessage)
      throw err
    } finally {
      initializingRef.current = false
    }
  }, [serverInfo, discoverServerWithRetry, connect, isConnected])

  /**
   * التحقق والتسجيل في الخلفية - لا يوقف العملية الأساسية
   */
  const checkAndRegisterDeviceInBackground = useCallback(async (
    deviceType: 'customer' | 'display' | 'window' | 'admin',
    deviceInfo: DeviceInfo
  ) => {
    try {
      console.log('[SERVER-CONNECTION] 🔍 Checking device registration in background...')

      // التحقق من وجود الجهاز
      const isAlreadyRegistered = await checkRegistration(deviceInfo.device_id)

      if (isAlreadyRegistered) {
        console.log('[SERVER-CONNECTION] ✅ Device already exists, updating status...')
        // تحديث الحالة إلى online
        try {
          await updateDeviceStatus('online')
        } catch (statusError) {
          console.warn('[SERVER-CONNECTION] ⚠️ Failed to update status:', statusError)
        }
      } else {
        console.log('[SERVER-CONNECTION] 📱 Device not found, registering...')
        // تسجيل جهاز جديد
        try {
          await registerDevice(deviceType)
          console.log('[SERVER-CONNECTION] ✅ Device registered in background')
        } catch (regError) {
          console.warn('[SERVER-CONNECTION] ⚠️ Background registration failed:', regError)
          // لا نرمي error هنا لأنه في الخلفية
        }
      }
    } catch (error) {
      console.warn('[SERVER-CONNECTION] ⚠️ Background check failed:', error)
      // لا نرمي error هنا لأنه في الخلفية
    }
  }, [checkRegistration, updateDeviceStatus, registerDevice])

  /**
   * إعادة الاتصال
   */
  const reconnect = useCallback(async () => {
    if (!deviceInfo?.device_type) {
      throw new Error('Device type not available - call initialize first')
    }

    console.log('[SERVER-CONNECTION] 🔄 Reconnecting...')

    // قطع الاتصال الحالي أولاً
    await disconnect()

    // إعادة التهيئة
    await initialize(deviceInfo.device_type)
  }, [deviceInfo, disconnect, initialize])

  /**
   * مسح جميع الأخطاء
   */
  const clearErrors = useCallback(() => {
    clearDiscoveryError()
    clearConnectionError()
    clearRegistrationError()
  }, [clearDiscoveryError, clearConnectionError, clearRegistrationError])

  // إعادة الاتصال التلقائي عند انقطاع الاتصال (مستقر وذكي مع منع التكرار)
  useEffect(() => {
    // شروط إعادة الاتصال:
    // 1. غير متصل حالياً
    // 2. الجهاز مسجل (أي كان متصل من قبل)
    // 3. ليس في حالة اتصال أو اكتشاف أو تسجيل أو تهيئة
    // 4. معلومات الجهاز متوفرة
    // 5. معلومات الخادم متوفرة
    const shouldReconnect = !isConnected &&
                           isRegistered &&
                           deviceInfo &&
                           serverInfo &&
                           !isConnecting &&
                           !isDiscovering &&
                           !isRegistering &&
                           !initializingRef.current

    if (shouldReconnect) {
      console.log('[SERVER-CONNECTION] 🔄 Connection lost, attempting smart reconnect...')

      const timeout = setTimeout(() => {
        // تحقق مرة أخرى من الشروط قبل إعادة الاتصال
        if (!initializingRef.current && deviceInfo && serverInfo && !isConnected) {
          const serverUrl = `http://${serverInfo.ip}:${serverInfo.port}`
          console.log('[SERVER-CONNECTION] 🔌 Attempting socket reconnection...')

          connect(serverUrl, deviceInfo).catch(err => {
            console.error('[SERVER-CONNECTION] ❌ Socket reconnect failed:', err)
            // في حالة فشل الاتصال، نجرب إعادة التهيئة الكاملة (بعد delay أطول)
            setTimeout(() => {
              if (!initializingRef.current && deviceInfo) {
                initialize(deviceInfo.device_type).catch(initErr => {
                  console.error('[SERVER-CONNECTION] ❌ Full reconnect failed:', initErr)
                })
              }
            }, 5000)
          })
        }
      }, 3000) // محاولة إعادة الاتصال بعد 3 ثوان

      return () => clearTimeout(timeout)
    }

    // Return undefined for other code paths
    return undefined
  }, [isConnected, isRegistered, deviceInfo, serverInfo, isConnecting, isDiscovering, isRegistering, connect, initialize])

  return {
    // Discovery
    isDiscovering,
    serverInfo,
    discoveryError,

    // Connection
    isConnected,
    isConnecting,
    connectionError,
    socketId,

    // Device Registration
    isRegistered,
    isRegistering,
    registrationError,
    device,
    deviceInfo,

    // Actions
    initialize,
    reconnect,
    disconnect,

    // Socket Events
    emit,
    onEvent,

    // Utilities
    clearErrors,
    isReady
  }
}
