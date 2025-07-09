import { useState, useCallback, useEffect } from 'react'

export interface DeviceInfo {
  device_id: string
  name: string
  device_type: 'customer' | 'display' | 'window' | 'admin'
  ip_address?: string
}

interface UseSocketConnectionReturn {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  socketId: string | null
  connect: (serverUrl: string, deviceInfo?: DeviceInfo) => Promise<void>
  disconnect: () => Promise<void>
  emit: (event: string, data?: any) => Promise<void>
  onEvent: (event: string, callback: Function) => () => void
  clearError: () => void
}

/**
 * Hook لإدارة اتصال Socket.IO مع الخادم
 * يستخدم الـ API الموجود في backend
 */
export const useSocketConnection = (): UseSocketConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [socketId, setSocketId] = useState<string | null>(null)

  // مراقبة حالة الاتصال
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await window.api.isSocketConnected()
        if (status.success) {
          setIsConnected(status.connected)
          setSocketId(status.socketId || null)
        }
      } catch (err) {
        console.error('[SOCKET-CONNECTION] Error checking status:', err)
      }
    }

    // فحص الحالة كل 5 ثوان
    const interval = setInterval(checkConnection, 5000)

    // فحص فوري
    checkConnection()

    return () => clearInterval(interval)
  }, [])

  // الاستماع لأحداث الاتصال
  useEffect(() => {
    const unsubscribeConnection = window.api.onSocketEvent('connection-status', (data: any) => {
      setIsConnected(data.connected)
      if (data.connected) {
        setSocketId(data.socketId || null)
        setConnectionError(null)
      } else {
        setSocketId(null)
        if (data.error) {
          setConnectionError(data.error)
        }
      }
    })

    return () => unsubscribeConnection()
  }, [])

  const connect = useCallback(async (serverUrl: string, deviceInfo?: DeviceInfo) => {
    if (isConnecting) return // منع multiple connections

    setIsConnecting(true)
    setConnectionError(null)

    try {
      console.log('[SOCKET-CONNECTION] 🔌 Connecting to:', serverUrl)

      const result = await window.api.connectSocket(serverUrl, deviceInfo)

      if (result.success && result.connected) {
        setIsConnected(true)
        console.log('[SOCKET-CONNECTION] ✅ Connected successfully')

        // Socket تسجيل الجهاز للأحداث الفورية فقط (التسجيل الفعلي يتم عبر API)
        if (deviceInfo) {
          await window.api.registerSocketDevice(deviceInfo)
          console.log('[SOCKET-CONNECTION] � Device registered for real-time events:', deviceInfo.device_type)
        }
      } else {
        throw new Error('Connection failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error'
      setConnectionError(errorMessage)
      setIsConnected(false)
      console.error('[SOCKET-CONNECTION] ❌ Connection failed:', errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting])

  const disconnect = useCallback(async () => {
    try {
      console.log('[SOCKET-CONNECTION] 🔌 Disconnecting...')

      const result = await window.api.disconnectSocket()

      if (result.success) {
        setIsConnected(false)
        setSocketId(null)
        console.log('[SOCKET-CONNECTION] ✅ Disconnected successfully')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown disconnection error'
      setConnectionError(errorMessage)
      console.error('[SOCKET-CONNECTION] ❌ Disconnection failed:', errorMessage)
    }
  }, [])

  const emit = useCallback(async (event: string, data?: any) => {
    if (!isConnected) {
      throw new Error('Socket not connected')
    }

    try {
      const result = await window.api.socketEmit(event, data)
      if (!result.success) {
        throw new Error(result.error || 'Emit failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown emit error'
      console.error('[SOCKET-CONNECTION] ❌ Emit failed:', errorMessage)
      throw err
    }
  }, [isConnected])

  const onEvent = useCallback((event: string, callback: Function) => {
    return window.api.onSocketEvent(event, callback)
  }, [])

  const clearError = useCallback(() => {
    setConnectionError(null)
  }, [])

  return {
    isConnected,
    isConnecting,
    connectionError,
    socketId,
    connect,
    disconnect,
    emit,
    onEvent,
    clearError
  }
}
