import { useState, useCallback } from 'react'

export interface PrinterInfo {
  id: number
  name: string
  printer_name?: string
  manufacturer?: string
  model?: string
  status?: string
  type?: string
  isDefault?: boolean
  location?: string
  portName?: string
  driverName?: string
  paperSizes?: string[]
  resolution?: string
  color?: boolean
  duplex?: boolean
  comment?: string
}

export const useAdminPrinters = () => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrinters = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use the correct IPC call for getting device printers
      const result = await window.api.getDevicePrinters()

      console.log('Printer data received:', result) // Debug log

      if (result && result.success) {
        console.log('Printers array:', result.data) // Debug log
        setPrinters(result.data || [])
      } else {
        setError(result?.error || 'فشل في تحميل الطابعات')
        setPrinters([])
      }
    } catch (error) {
      console.error('Error loading printers:', error) // Debug log
      setError(error instanceof Error ? error.message : 'فشل في تحميل الطابعات')
      setPrinters([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deletePrinter = useCallback(async (printerId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.deleteDevicePrinter(printerId)

      if (result && result.success) {
        // Reload printers after successful deletion
        await loadPrinters()
        return { success: true }
      } else {
        setError(result?.error || 'فشل في حذف الطابعة')
        return { success: false, error: result?.error || 'فشل في حذف الطابعة' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الطابعة'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [loadPrinters])

  return {
    printers,
    isLoading,
    error,
    loadPrinters,
    deletePrinter
  }
}
