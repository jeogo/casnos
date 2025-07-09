import { useState, useCallback } from 'react'

interface ServerInfo {
  ip: string
  port: number
  name?: string
  timestamp?: string
}

interface UseUdpDiscoveryReturn {
  isDiscovering: boolean
  serverInfo: ServerInfo | null
  error: string | null
  discoverServer: () => Promise<void>
  clearError: () => void
}

/**
 * Hook لاكتشاف الخادم عبر UDP Discovery
 * يستخدم الـ API الموجود في backend
 */
export const useUdpDiscovery = (): UseUdpDiscoveryReturn => {
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const discoverServer = useCallback(async () => {
    if (isDiscovering) return // منع multiple discoveries

    setIsDiscovering(true)
    setError(null)

    try {
      console.log('[UDP-DISCOVERY] 🔍 Starting server discovery...')

      // استخدام الـ API الموجود
      const result = await window.api.discoverServerUdp()

      if (result && result.ip && result.port) {
        const discoveredServer: ServerInfo = {
          ip: result.ip,
          port: result.port,
          name: 'CASNOS Server',
          timestamp: new Date().toISOString()
        }

        setServerInfo(discoveredServer)

        // حفظ معلومات الخادم للاستخدام المستقبلي
        await window.api.updateServerInfo(discoveredServer)

        console.log('[UDP-DISCOVERY] ✅ Server discovered:', discoveredServer)
      } else {
        throw new Error('No server found on network')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown discovery error'
      setError(errorMessage)
      console.error('[UDP-DISCOVERY] ❌ Discovery failed:', errorMessage)
    } finally {
      setIsDiscovering(false)
    }
  }, [isDiscovering])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isDiscovering,
    serverInfo,
    error,
    discoverServer,
    clearError
  }
}
