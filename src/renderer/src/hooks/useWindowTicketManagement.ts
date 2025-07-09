import { useState, useCallback, useRef } from 'react'

interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  status: 'pending' | 'called' | 'served'
  print_status: 'pending' | 'printing' | 'printed' | 'print_failed'
  created_at: string
  called_at: string | null
  window_id?: number
}

interface WindowTicketManagementState {
  // Current ticket
  currentTicket: Ticket | null
  currentTicketNumber: string | null

  // Loading states
  isCallingNext: boolean

  // Status states
  hasNoTickets: boolean // NEW: indicates no tickets available (not an error)
  noTicketsMessage: string | null // NEW: friendly message when no tickets

  // Error states (only for real errors)
  error: string | null

  // Actions
  callNextTicket: (windowId: number, serviceId?: number) => Promise<Ticket | null>
  clearError: () => void
  clearCurrentTicket: () => void
  clearNoTicketsState: () => void // NEW: clear no tickets state
}

/**
 * Hook لإدارة التذاكر في WindowScreen
 * Window Ticket Management Hook
 */
export const useWindowTicketManagement = (): WindowTicketManagementState => {
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [currentTicketNumber, setCurrentTicketNumber] = useState<string | null>(null)
  const [isCallingNext, setIsCallingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNoTickets, setHasNoTickets] = useState(false)
  const [noTicketsMessage, setNoTicketsMessage] = useState<string | null>(null)

  // منع التكرار في العمليات
  const callingRef = useRef(false)

  // استدعاء التذكرة التالية مع إنهاء الحالية
  const callNextTicket = useCallback(async (
    windowId: number,
    serviceId?: number
  ): Promise<Ticket | null> => {
    if (isCallingNext || callingRef.current) {
      console.warn('[WINDOW-TICKET] Call already in progress')
      return null
    }

    try {
      callingRef.current = true
      setIsCallingNext(true)
      setError(null)
      setHasNoTickets(false)
      setNoTicketsMessage(null)



      // استدعاء API الجديدة
      const result = await window.api.callNextTicketForWindow(
        windowId,
        serviceId,
        currentTicket?.id // إنهاء التذكرة الحالية تلقائياً
      )


      if (result.success && result.data) {
        const newTicket = result.data as Ticket



        // تحديث التذكرة الحالية
        setCurrentTicket(newTicket)
        setCurrentTicketNumber(newTicket.ticket_number)

        // مسح حالة "لا توجد تذاكر" عند نجاح الاستدعاء
        setHasNoTickets(false)
        setNoTicketsMessage(null)

        // تشغيل الإعلان الصوتي (يتم بواسطة الخادم)

        return newTicket
      } else {
        // لا توجد تذاكر في الانتظار - هذا ليس خطأ، بل حالة عادية
        const message = result.message || 'No pending tickets for this service'

        // إذا لم تكن هناك تذاكر، امسح التذكرة الحالية
        if (currentTicket) {
          setCurrentTicket(null)
          setCurrentTicketNumber(null)
        }

        // تعيين حالة "لا توجد تذاكر" بدلاً من خطأ
        setHasNoTickets(true)
        setNoTicketsMessage(message)

        return null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error calling next ticket'
      console.error('[WINDOW-TICKET] ❌ Failed to call next ticket:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setIsCallingNext(false)
      callingRef.current = false
    }
  }, [currentTicket, isCallingNext])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    callingRef.current = false
  }, [])

  // مسح حالة "لا توجد تذاكر"
  const clearNoTicketsState = useCallback(() => {
    setHasNoTickets(false)
    setNoTicketsMessage(null)
  }, [])

  // مسح التذكرة الحالية
  const clearCurrentTicket = useCallback(() => {
    setCurrentTicket(null)
    setCurrentTicketNumber(null)
    setHasNoTickets(false)
    setNoTicketsMessage(null)
  }, [])

  return {
    // State
    currentTicket,
    currentTicketNumber,

    // Loading states
    isCallingNext,

    // Status states
    hasNoTickets,
    noTicketsMessage,

    // Error states (only for real errors)
    error,

    // Actions
    callNextTicket,
    clearError,
    clearCurrentTicket,
    clearNoTicketsState
  }
}
