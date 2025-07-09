import { useState, useCallback, useRef } from 'react'
import { DeviceInfo } from './useServerConnection'
import { getDeviceInfo, validateDeviceInfo } from '../utils/deviceInfo'

interface UseDeviceRegistrationReturn {
  // Registration State
  isRegistered: boolean
  isRegistering: boolean
  registrationError: string | null
  device: any | null
  deviceInfo: DeviceInfo | null

  // Actions
  registerDevice: (deviceType: 'customer' | 'display' | 'window' | 'admin') => Promise<void>
  checkRegistration: (deviceId: string) => Promise<boolean>
  updateDeviceStatus: (status: 'online' | 'offline') => Promise<void>

  // Utilities
  clearError: () => void
}

/**
 * Hook لإدارة تسجيل الأجهزة
 * يتعامل مع التحقق من التسجيل السابق ومنع التسجيل المكرر
 */
export const useDeviceRegistration = (): UseDeviceRegistrationReturn => {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [device, setDevice] = useState<any | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  // منع التسجيل المكرر للجهاز نفسه
  const registrationInProgress = useRef<Set<string>>(new Set())

  /**
   * التحقق من وجود الجهاز في قاعدة البيانات
   */
  const checkRegistration = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      console.log('[DEVICE-REGISTRATION] 🔍 Checking registration for:', deviceId)

      const result = await window.api.getDeviceByDeviceId(deviceId)

      if (result.success && result.device) {
        console.log('[DEVICE-REGISTRATION] ✅ Device found in database:', result.device)
        setDevice(result.device)
        setIsRegistered(true)
        return true
      } else {
        console.log('[DEVICE-REGISTRATION] ℹ️ Device not found in database')
        setDevice(null)
        setIsRegistered(false)
        return false
      }
    } catch (error) {
      console.error('[DEVICE-REGISTRATION] ❌ Error checking registration:', error)
      setIsRegistered(false)
      setDevice(null)
      return false
    }
  }, [])

  /**
   * تسجيل الجهاز أو تحديث حالته
   */
  const registerDevice = useCallback(async (deviceType: 'customer' | 'display' | 'window' | 'admin') => {
    if (isRegistering) return

    setIsRegistering(true)
    setRegistrationError(null)

    try {
      console.log('[DEVICE-REGISTRATION] 🚀 Starting device registration for:', deviceType)

      // 1. الحصول على معلومات الجهاز الحقيقية
      const realDeviceInfo = await getDeviceInfo(deviceType)

      if (!validateDeviceInfo(realDeviceInfo)) {
        throw new Error('Invalid device information')
      }

      // منع التسجيل المكرر للجهاز نفسه
      if (registrationInProgress.current.has(realDeviceInfo.device_id)) {
        console.log('[DEVICE-REGISTRATION] ⏳ Registration already in progress for this device')
        return
      }

      registrationInProgress.current.add(realDeviceInfo.device_id)

      setDeviceInfo(realDeviceInfo)
      console.log('[DEVICE-REGISTRATION] 📱 Device info generated:', realDeviceInfo)

      // 2. التحقق من التسجيل السابق
      const isAlreadyRegistered = await checkRegistration(realDeviceInfo.device_id)

      if (isAlreadyRegistered) {
        console.log('[DEVICE-REGISTRATION] ✅ Device already registered, skipping registration')

        // تحديث الحالة فقط إلى online إذا لم تكن كذلك
        if (device?.status !== 'online') {
          try {
            const result = await window.api.updateDeviceStatus(realDeviceInfo.device_id, 'online')
            if (result.success && result.device) {
              setDevice(result.device)
              console.log('[DEVICE-REGISTRATION] 📱 Device status updated to online')
            }
          } catch (statusError) {
            console.warn('[DEVICE-REGISTRATION] ⚠️ Failed to update status to online:', statusError)
          }
        } else {
          console.log('[DEVICE-REGISTRATION] 📱 Device already online, no update needed')
        }
      } else {
        console.log('[DEVICE-REGISTRATION] ➕ Registering new device')

        try {
          // تسجيل جهاز جديد
          const registrationResult = await window.api.registerDevice({
            device_id: realDeviceInfo.device_id,
            name: realDeviceInfo.name,
            device_type: realDeviceInfo.device_type,
            ip_address: realDeviceInfo.ip_address,
            status: 'online'
          })

          console.log('[DEVICE-REGISTRATION] 🔍 Registration API response:', registrationResult)

          if (registrationResult.success && registrationResult.data) {
            setDevice(registrationResult.data)
            setIsRegistered(true)
            console.log('[DEVICE-REGISTRATION] ✅ Device registered successfully:', registrationResult.data)
          } else {
            throw new Error(registrationResult.error || 'Registration failed')
          }
        } catch (registrationError) {
          console.log('[DEVICE-REGISTRATION] ⚠️ Registration failed, checking if device was created anyway...')

          // إعادة التحقق من وجود الجهاز - قد يكون تم إنشاؤه بسبب race condition
          const recheckResult = await checkRegistration(realDeviceInfo.device_id)

          if (recheckResult) {
            console.log('[DEVICE-REGISTRATION] ✅ Device was created despite error - registration successful')
            // تحديث الحالة إلى online إذا لم تكن كذلك
            if (device?.status !== 'online') {
              try {
                const result = await window.api.updateDeviceStatus(realDeviceInfo.device_id, 'online')
                if (result.success && result.device) {
                  setDevice(result.device)
                }
              } catch (statusError) {
                console.warn('[DEVICE-REGISTRATION] ⚠️ Failed to update status to online:', statusError)
              }
            }
          } else {
            console.error('[DEVICE-REGISTRATION] ❌ Registration truly failed:', registrationError)
            throw registrationError
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown registration error'
      setRegistrationError(errorMessage)
      setIsRegistered(false)
      setDevice(null)
      console.error('[DEVICE-REGISTRATION] ❌ Registration failed:', errorMessage)
      throw error
    } finally {
      // إزالة الجهاز من قائمة التسجيل قيد التقدم
      if (deviceInfo?.device_id) {
        registrationInProgress.current.delete(deviceInfo.device_id)
      }
      setIsRegistering(false)
    }
  }, [isRegistering, checkRegistration, device?.status, deviceInfo])

  /**
   * تحديث حالة الجهاز
   */
  const updateDeviceStatus = useCallback(async (status: 'online' | 'offline') => {
    if (!deviceInfo?.device_id) {
      throw new Error('No device info available for status update')
    }

    try {
      console.log(`[DEVICE-REGISTRATION] 🔄 Updating device status to: ${status}`)

      const result = await window.api.updateDeviceStatus(deviceInfo.device_id, status)

      if (result.success && result.device) {
        setDevice(result.device)
        console.log(`[DEVICE-REGISTRATION] ✅ Device status updated to ${status}`)
      } else {
        throw new Error(result.error || 'Status update failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown status update error'
      console.error('[DEVICE-REGISTRATION] ❌ Status update failed:', errorMessage)
      throw error
    }
  }, [deviceInfo])

  /**
   * مسح الأخطاء
   */
  const clearError = useCallback(() => {
    setRegistrationError(null)
  }, [])

  return {
    // Registration State
    isRegistered,
    isRegistering,
    registrationError,
    device,
    deviceInfo,

    // Actions
    registerDevice,
    checkRegistration,
    updateDeviceStatus,

    // Utilities
    clearError
  }
}
