import { useState, useCallback, useRef } from 'react'

interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  service_name: string
  status: 'pending' | 'called' | 'served'
  print_status: 'pending' | 'printing' | 'printed' | 'print_failed'
  created_at: string
  position?: number
  print_type?: 'local' | 'network' // ✅ إضافة نوع الطباعة
}

interface CustomerTicketCreationState {
  // Current ticket being created
  currentTicket: Ticket | null

  // Loading states
  isCreating: boolean

  // Error states
  error: string | null

  // Actions
  createTicket: (serviceId: number, serviceName?: string, printType?: 'local' | 'network') => Promise<Ticket>
  clearError: () => void
  clearCurrentTicket: () => void
}

/**
 * Hook لإدارة إنشاء التذاكر للعملاء
 * Customer Ticket Creation Hook
 */
export const useCustomerTicketCreation = (): CustomerTicketCreationState => {
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // منع التكرار في العمليات
  const creatingRef = useRef(false)

  // إنشاء تذكرة جديدة
  const createTicket = useCallback(async (serviceId: number, serviceName?: string, printType: 'local' | 'network' = 'local'): Promise<Ticket> => {
    if (isCreating || creatingRef.current) {
      throw new Error('Ticket creation already in progress')
    }

    try {
      creatingRef.current = true
      setIsCreating(true)
      setError(null)

      console.log('[CUSTOMER-TICKET-CREATION] 🎫 Creating ticket for service:', serviceId, 'Print type:', printType)

      // ✅ Create ticket with print_type to set correct initial status on server
      const result = await window.api.createTicket(serviceId, printType)

      if (result.success && result.data) {
        // ✅ Use provided service name and include print type
        const ticket: Ticket = {
          ...result.data,
          service_name: serviceName || `Service ${serviceId}`,
          print_type: printType // ✅ حفظ نوع الطباعة في التذكرة
        }

        setCurrentTicket(ticket)
        console.log('[CUSTOMER-TICKET-CREATION] ✅ Ticket created successfully:', ticket.ticket_number, 'Print type:', printType)

        return ticket
      } else {
        throw new Error(result.error || 'Failed to create ticket')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating ticket'
      console.error('[CUSTOMER-TICKET-CREATION] ❌ Failed to create ticket:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
      creatingRef.current = false
    }
  }, [isCreating])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    // إعادة تعيين المرجع في حالة وجود مشكلة
    creatingRef.current = false
  }, [])

  // مسح التذكرة الحالية
  const clearCurrentTicket = useCallback(() => {
    setCurrentTicket(null)
  }, [])

  return {
    // State
    currentTicket,

    // Loading states
    isCreating,

    // Error states
    error,

    // Actions
    createTicket,
    clearError,
    clearCurrentTicket
  }
}
