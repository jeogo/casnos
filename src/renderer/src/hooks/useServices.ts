import { useState, useEffect, useCallback } from 'react'

interface Service {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

interface UseServicesReturn {
  services: Service[] | null
  isLoading: boolean
  error: string | null
  refreshServices: () => Promise<void>
}

export const useServices = (): UseServicesReturn => {
  const [services, setServices] = useState<Service[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshServices = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await (window as any).electronAPI.getServices()
      if (response.success) {
        setServices(response.data || [])
      } else {
        setError(response.message || 'Failed to fetch services')
        setServices([])
      }
    } catch (err) {
      setError('Error fetching services')
      setServices([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshServices()
  }, [refreshServices])

  return {
    services,
    isLoading,
    error,
    refreshServices
  }
}
