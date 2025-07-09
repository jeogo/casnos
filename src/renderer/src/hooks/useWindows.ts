import { useState, useEffect, useCallback } from 'react'

interface WindowData {
  id: number
  name?: string
  service_id?: number
  device_id?: string
  active: boolean
  created_at: string
}

interface UseWindowsReturn {
  windows: WindowData[] | null
  isLoading: boolean
  error: string | null
  refreshWindows: () => Promise<void>
}

export const useWindows = (): UseWindowsReturn => {
  const [windows, setWindows] = useState<WindowData[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshWindows = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await (window as any).electronAPI.getWindows()
      if (response.success) {
        setWindows(response.data || [])
      } else {
        setError(response.message || 'Failed to fetch windows')
        setWindows([])
      }
    } catch (err) {
      setError('Error fetching windows')
      setWindows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshWindows()
  }, [refreshWindows])

  return {
    windows,
    isLoading,
    error,
    refreshWindows
  }
}
