import { Request, Response } from 'express'
import { ticketOperations, serviceOperations, windowOperations } from '../db/database'
import { CreateTicketRequest, CallTicketRequest, CreateNetworkPrintTicketRequest } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { emitEvent } from '../utils/socketInstance'

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const { service_id, printer_id }: CreateTicketRequest = req.body

  if (!service_id) {
    throw createError('Service ID is required', 400)
  }

  // Verify service exists
  const service = serviceOperations.getById(service_id)
  if (!service) {
    throw createError('Service not found', 404)
  }

  // Create ticket with global numbering
  const newTicket = ticketOperations.create({
    service_id: service_id,
    service_name: service.name,
    status: 'pending',
    printer_id: printer_id || null
  })

  // Emit WebSocket event
  emitEvent('ticket:new', newTicket)

  res.status(201).json({
    success: true,
    data: newTicket
  })
})

export const callTicket = asyncHandler(async (req: Request, res: Response) => {
  const { ticket_id, window_label, window_id }: CallTicketRequest & { window_id?: number } = req.body

  if (!ticket_id) {
    throw createError('Ticket ID is required', 400)
  }

  let finalWindowLabel = window_label
  // If window_id is provided, get the window label
  if (window_id && !window_label) {
    const window = windowOperations.getById(window_id)
    if (!window) {
      throw createError('Window not found', 404)
    }
    finalWindowLabel = window.label
  }

  if (!finalWindowLabel) {
    throw createError('Window label or window ID is required', 400)
  }

  // Get ticket
  const ticket = ticketOperations.getById(ticket_id)
  if (!ticket) {
    throw createError('Ticket not found', 404)
  }

  if (ticket.status !== 'pending') {
    throw createError('Ticket is not in pending status', 400)
  }
  // Update ticket status
  const updatedTicket = ticketOperations.updateStatus(ticket_id, 'called', finalWindowLabel)

  if (!updatedTicket) {
    throw createError('Failed to update ticket', 500)
  }

  // تم حذف السجلات - لا داعي للطباعة هنا

  // Emit WebSocket event
  emitEvent('ticket:called', updatedTicket)

  // تم حذف السجل - لا داعي للطباعة هنا

  res.json({
    success: true,
    data: updatedTicket
  })
})

export const getAllTickets = asyncHandler(async (req: Request, res: Response) => {
  const tickets = ticketOperations.getAll()

  res.json({
    success: true,
    count: tickets.length,
    data: tickets
  })
})

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id!)

  if (isNaN(ticketId)) {
    throw createError('Invalid ticket ID', 400)
  }

  const ticket = ticketOperations.getById(ticketId)

  if (!ticket) {
    throw createError('Ticket not found', 404)
  }

  res.json({
    success: true,
    data: ticket
  })
})

export const getPendingTickets = asyncHandler(async (req: Request, res: Response) => {
  const tickets = ticketOperations.getPendingTickets()

  res.json({
    success: true,
    count: tickets.length,
    data: tickets
  })
})

export const getTicketsByService = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = parseInt(req.params.serviceId!)

  if (isNaN(serviceId)) {
    throw createError('Invalid service ID', 400)
  }

  const tickets = ticketOperations.getByServiceId(serviceId)

  res.json({
    success: true,
    count: tickets.length,
    data: tickets
  })
})

export const updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id!)
  const { status, window_label } = req.body

  if (isNaN(ticketId)) {
    throw createError('Invalid ticket ID', 400)
  }

  if (!status) {
    throw createError('Status is required', 400)
  }
  const validStatuses = ['pending', 'called', 'served']
  if (!validStatuses.includes(status)) {
    throw createError('Invalid status', 400)
  }

  const updatedTicket = ticketOperations.updateStatus(ticketId, status, window_label)

  if (!updatedTicket) {
    throw createError('Ticket not found or failed to update', 404)
  }
  // Emit appropriate WebSocket event
  if (status === 'called') {
    emitEvent('ticket:called', updatedTicket)
  } else {
    emitEvent('ticket:updated', updatedTicket)
  }

  res.json({
    success: true,
    data: updatedTicket
  })
})

export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id!)

  if (isNaN(ticketId)) {
    throw createError('Invalid ticket ID', 400)
  }

  const deleted = ticketOperations.delete(ticketId)

  if (!deleted) {
    throw createError('Ticket not found', 404)
  }
  // Emit WebSocket event
  emitEvent('ticket-deleted', { id: ticketId })

  res.json({
    success: true,
    message: 'Ticket deleted successfully'
  })
})

// Helper function to determine target device based on printer
function determineTargetDevice(printerId: string): string {
  if (!printerId) return 'local';

  const isNetworkPrinter = printerId.toLowerCase().includes('network') ||
                          printerId.toLowerCase().includes('display') ||
                          printerId.toLowerCase().includes('remote') ||
                          printerId.startsWith('\\\\');

  return isNetworkPrinter ? 'display-screen-001' : 'local';
}

// Helper function to check if printer requires network printing
function isNetworkPrinter(printerId: string): boolean {
  if (!printerId) return false;

  return printerId.toLowerCase().includes('network') ||
         printerId.toLowerCase().includes('display') ||
         printerId.toLowerCase().includes('remote') ||
         printerId.startsWith('\\\\');
}

// 🚀 NEW API: Create ticket with network printing support
export const createNetworkPrintTicket = asyncHandler(async (req: Request, res: Response) => {
  const { service_id, printer_id, ticketData }: CreateNetworkPrintTicketRequest = req.body

  if (!service_id) {
    throw createError('Service ID is required', 400)
  }

  if (!printer_id) {
    throw createError('Printer ID is required', 400)
  }

  // Verify service exists
  const service = serviceOperations.getById(service_id)
  if (!service) {
    throw createError('Service not found', 404)
  }

  const targetDevice = determineTargetDevice(printer_id)
  const requiresNetworkPrint = isNetworkPrinter(printer_id)

  try {
    // 1️⃣ Create ticket with pending print status
    const newTicket = ticketOperations.create({
      service_id: service_id,
      service_name: service.name,
      status: 'pending',
      print_status: requiresNetworkPrint ? 'pending' : 'printed', // Local prints are immediate
      printer_id: printer_id,
      target_device: targetDevice
    })

    // تم حذف السجل - لا داعي للطباعة هنا

    // 2️⃣ Send to all displays for queue updates
    emitEvent('ticket:new', newTicket)

    if (requiresNetworkPrint) {
      // 3️⃣ Update print status to printing
      ticketOperations.updatePrintStatus(newTicket.id, 'printing')

      // 4️⃣ Send print request to target device
      const printJobData = {
        ticketId: newTicket.id,
        ticketData: {
          ...newTicket,
          company_name: ticketData.company_name,
          position: newTicket.position || 1,
          window_number: ticketData.window_number || 1
        },
        printerId: printer_id,
        timestamp: Date.now()
      }

      // Send via Socket.IO to target device
      emitEvent('instant-print-request', printJobData)

      // تم حذف السجل - لا داعي للطباعة هنا

      // 5️⃣ Set timeout for print completion (10 seconds)
      setTimeout(async () => {
        const ticket = ticketOperations.getById(newTicket.id)
        if (ticket && ticket.print_status === 'printing') {
          // Print timeout - mark as failed
          ticketOperations.updatePrintStatus(newTicket.id, 'print_failed')
          emitEvent('print-timeout', { ticketId: newTicket.id })
          // تم حذف السجل - لا داعي للطباعة هنا
        }
      }, 10000)

      res.status(201).json({
        success: true,
        ticket: { ...newTicket, print_status: 'printing' },
        printMethod: 'network',
        targetDevice,
        message: 'Ticket created and sent for network printing'
      })

    } else {
      // Local printing - return immediately
      res.status(201).json({
        success: true,
        ticket: newTicket,
        printMethod: 'local',
        message: 'Ticket created for local printing'
      })
    }

  } catch (error) {
    // تم حذف السجل - لا داعي للطباعة هنا
    throw createError('Failed to create ticket', 500)
  }
})

// 🔄 API: Update print status (called by printing devices)
export const updatePrintStatus = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id!)
  const { print_status, error_message }: { print_status: 'printed' | 'print_failed', error_message?: string } = req.body

  if (isNaN(ticketId)) {
    throw createError('Invalid ticket ID', 400)
  }

  if (!print_status || !['printed', 'print_failed'].includes(print_status)) {
    throw createError('Invalid print status', 400)
  }

  const updatedTicket = ticketOperations.updatePrintStatus(ticketId, print_status)

  if (!updatedTicket) {
    throw createError('Ticket not found', 404)
  }

  // Emit event for real-time updates
  emitEvent('print-status-updated', {
    ticketId,
    printStatus: print_status,
    ticket: updatedTicket,
    errorMessage: error_message
  })

  res.json({
    success: true,
    ticket: updatedTicket,
    message: `Print status updated to ${print_status}`
  })
})

// Get statistics
export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const allTickets = ticketOperations.getAll()
    const allServices = serviceOperations.getAll()
    const allWindows = windowOperations.getAll()

    // Get today's tickets
    const today = new Date().toDateString()
    const todayTickets = allTickets.filter(ticket =>
      new Date(ticket.created_at).toDateString() === today
    )

    // Get pending tickets
    const pendingTickets = ticketOperations.getPendingTickets()

    // Get active windows
    const activeWindows = windowOperations.getActiveWindows()

    const statistics = {
      tickets: {
        total: allTickets.length,
        today: todayTickets.length,
        pending: pendingTickets.length,
        served: allTickets.filter(t => t.status === 'served').length
      },
      services: {
        total: allServices.length,
        active: allServices.length // All services are considered active
      },
      windows: {
        total: allWindows.length,
        active: activeWindows.length,
        inactive: allWindows.length - activeWindows.length
      }
    }

    res.json({
      success: true,
      data: statistics
    })
  } catch (error) {
    throw createError('Failed to get statistics', 500)
  }
})
