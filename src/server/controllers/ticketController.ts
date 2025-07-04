import { Request, Response } from 'express'
import { ticketOperations, serviceOperations, windowOperations } from '../db'
import { CreateTicketRequest, CallTicketRequest, CreateNetworkPrintTicketRequest } from '../types'
import { asyncHandler, createError } from '../middleware/errorMiddleware'

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const { service_id }: CreateTicketRequest = req.body

  if (!service_id || typeof service_id !== 'number') {
    throw createError('Valid numeric service ID is required', 400)
  }

  // Verify service exists
  const service = serviceOperations.getById(service_id)
  if (!service) {
    throw createError(`Service with ID ${service_id} not found`, 404)
  }

  // Create ticket with global numbering and print status
  const newTicket = ticketOperations.create({
    service_id: service_id,
    status: 'pending',
    print_status: 'pending'  // Initialize print status
  })

  // Emit WebSocket events for real-time updates
  const { getSocketIO } = require('../socket/socket.instance')
  const io = getSocketIO()

  if (io) {
    // Emit ticket created event
    io.emit('ticket:created', {
      ticket: newTicket,
      service_name: service.name,
      ticket_number: newTicket.ticket_number,
      timestamp: new Date().toISOString()
    })

    // Emit queue updated event
    const pendingCount = ticketOperations.getPendingTickets().length
    io.emit('queue:updated', {
      pending: pendingCount,
      total: ticketOperations.getAll().length,
      timestamp: new Date().toISOString()
    })
  }

  res.status(201).json({
    success: true,
    data: newTicket,
    message: 'Ticket created successfully'
  })
})

export const callTicket = asyncHandler(async (req: Request, res: Response) => {
  const { ticket_id, window_id }: CallTicketRequest = req.body

  if (!ticket_id) {
    throw createError('Ticket ID is required', 400)
  }

  if (!window_id) {
    throw createError('Window ID is required', 400)
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
  const updatedTicket = ticketOperations.updateStatus(ticket_id, 'called', window_id)

  if (!updatedTicket) {
    throw createError('Failed to update ticket', 500)
  }

  // Get service and window info for socket emission
  const service = serviceOperations.getById(updatedTicket.service_id)
  const window = windowOperations.getById(window_id)

  // Emit WebSocket events for real-time updates
  const { getSocketIO } = require('../socket/socket.instance')
  const io = getSocketIO()

  if (io) {
    // Emit ticket called event
    io.emit('ticket:called', {
      ticket: updatedTicket,
      ticket_number: updatedTicket.ticket_number,
      service_name: service?.name || 'Unknown Service',
      window_id: window_id,
      window_number: window?.id || window_id,
      timestamp: new Date().toISOString()
    })

    // Emit display update for the specific window
    io.emit('display:ticket-called', {
      ticket_number: updatedTicket.ticket_number,
      service_name: service?.name || 'Unknown Service',
      window_id: window_id,
      status: 'called',
      timestamp: new Date().toISOString()
    })

    // Emit queue status update
    const pendingCount = ticketOperations.getPendingTickets().length
    const calledCount = ticketOperations.getAll().filter(t => t.status === 'called').length

    io.emit('queue:updated', {
      pending: pendingCount,
      called: calledCount,
      total: ticketOperations.getAll().length,
      timestamp: new Date().toISOString()
    })
  }

  res.json({
    success: true,
    data: updatedTicket,
    message: `Ticket ${updatedTicket.ticket_number} called to window ${window_id}`
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
  const { status, window_id } = req.body

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

  const updatedTicket = ticketOperations.updateStatus(ticketId, status, window_id)

  if (!updatedTicket) {
    throw createError('Ticket not found or failed to update', 404)
  }

  // Emit WebSocket events for status updates
  const { getSocketIO } = require('../socket/socket.instance')
  const io = getSocketIO()

  if (io) {
    // Get service info for better context
    const service = serviceOperations.getById(updatedTicket.service_id)

    // Emit ticket status updated event
    io.emit('ticket:status-updated', {
      ticket: updatedTicket,
      ticket_number: updatedTicket.ticket_number,
      service_name: service?.name || 'Unknown Service',
      old_status: 'previous', // Would need to track this if needed
      new_status: status,
      window_id: window_id,
      timestamp: new Date().toISOString()
    })

    // If ticket is served, emit served event
    if (status === 'served') {
      io.emit('ticket:served', {
        ticket: updatedTicket,
        ticket_number: updatedTicket.ticket_number,
        service_name: service?.name || 'Unknown Service',
        window_id: window_id,
        timestamp: new Date().toISOString()
      })
    }

    // Update queue counts
    const allTickets = ticketOperations.getAll()
    const pendingCount = allTickets.filter(t => t.status === 'pending').length
    const calledCount = allTickets.filter(t => t.status === 'called').length
    const servedCount = allTickets.filter(t => t.status === 'served').length

    io.emit('queue:updated', {
      pending: pendingCount,
      called: calledCount,
      served: servedCount,
      total: allTickets.length,
      timestamp: new Date().toISOString()
    })
  }

  res.json({
    success: true,
    data: updatedTicket,
    message: `Ticket ${updatedTicket.ticket_number} status updated to ${status}`
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

  res.json({
    success: true,
    message: 'Ticket deleted successfully'
  })
})

// Get queue status
export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const pendingTickets = ticketOperations.getPendingTickets()
  const allTickets = ticketOperations.getAll()

  const stats = {
    pending: pendingTickets.length,
    total: allTickets.length,
    served: allTickets.filter(t => t.status === 'served').length,
    called: allTickets.filter(t => t.status === 'called').length
  }

  res.json({
    success: true,
    data: {
      stats,
      pendingTickets,
      timestamp: new Date().toISOString()
    }
  })
})

// Get recent tickets
export const getRecentTickets = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10
  const allTickets = ticketOperations.getAll()

  // Get most recent tickets (sorted by creation time, most recent first)
  const recentTickets = allTickets
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  res.json({
    success: true,
    count: recentTickets.length,
    data: recentTickets
  })
})

// Get system statistics
export const getSystemStats = asyncHandler(async (req: Request, res: Response) => {
  const allTickets = ticketOperations.getAll()
  const pendingTickets = ticketOperations.getPendingTickets()

  // Calculate today's tickets
  const today = new Date().toDateString()
  const todayTickets = allTickets.filter(ticket =>
    new Date(ticket.created_at).toDateString() === today
  )

  const stats = {
    tickets: {
      total: allTickets.length,
      pending: pendingTickets.length,
      served: allTickets.filter(t => t.status === 'served').length,
      called: allTickets.filter(t => t.status === 'called').length,
      today: todayTickets.length
    },
    system: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  res.json({
    success: true,
    data: stats
  })
})

// Create ticket with updated status
export const createNetworkPrintTicket = asyncHandler(async (req: Request, res: Response) => {
  const { service_id, ticketData }: CreateNetworkPrintTicketRequest = req.body

  if (!service_id) {
    throw createError('Service ID is required', 400)
  }

  // Verify service exists
  const service = serviceOperations.getById(service_id)
  if (!service) {
    throw createError('Service not found', 404)
  }

  try {
    // Create ticket with default status
    const newTicket = ticketOperations.create({
      service_id: service_id,
      status: 'pending',
      print_status: 'pending'
    })

    // تم حذف السجل - لا داعي للطباعة هنا

    // 2️⃣ Send to all displays for queue updates

    res.status(201).json({
      success: true,
      ticket: newTicket,
      message: 'Ticket created successfully'
    })

  } catch (error) {
    // تم حذف السجل - لا داعي للطباعة هنا
    throw createError('Failed to create ticket', 500)
  }
})

// 🔄 API: Update print status (called by printing devices)
export const updatePrintStatus = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id!)
  const { print_status, error_message }: { print_status: 'pending' | 'printing' | 'printed' | 'print_failed', error_message?: string } = req.body

  if (isNaN(ticketId)) {
    throw createError('Invalid ticket ID', 400)
  }

  if (!print_status || !['pending', 'printing', 'printed', 'print_failed'].includes(print_status)) {
    throw createError('Invalid print status', 400)
  }

  const updatedTicket = ticketOperations.updatePrintStatus(ticketId, print_status)

  if (!updatedTicket) {
    throw createError('Ticket not found', 404)
  }

  // Emit WebSocket events for real-time updates
  const { getSocketIO } = require('../socket/socket.instance')
  const io = getSocketIO()

  if (io) {
    // Emit general print status update
    io.emit('print:status-updated', {
      ticket: updatedTicket,
      ticket_number: updatedTicket.ticket_number,
      print_status,
      error_message,
      timestamp: new Date().toISOString()
    })

    // 🚨 SMART WINDOW NOTIFICATION: When ticket is printed, notify specific windows
    if (print_status === 'printed' && updatedTicket.status === 'pending') {
      // Get service information
      const service = serviceOperations.getById(updatedTicket.service_id)


      console.log(`🎫 Ticket #${updatedTicket.ticket_number} printed - notified service windows for ${service?.name}`)
    }
  }

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

// Call next ticket in queue
export const callNextTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { window_id } = req.body

  if (!window_id) {
    throw createError('Window ID is required', 400)
  }

  // Get next pending ticket
  const pendingTickets = ticketOperations.getPendingTickets()

  if (pendingTickets.length === 0) {
    res.json({
      success: false,
      message: 'No pending tickets',
      data: null
    })
    return
  }

  // Get the oldest pending ticket
  const sortedTickets = pendingTickets.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const nextTicket = sortedTickets[0]

  if (!nextTicket) {
    res.json({
      success: false,
      message: 'No pending tickets available',
      data: null
    })
    return
  }

  // Update ticket status to called
  const updatedTicket = ticketOperations.updateStatus(nextTicket.id, 'called', window_id)

  if (!updatedTicket) {
    throw createError('Failed to call ticket', 500)
  }

  const window = windowOperations.getById(window_id)

  res.json({
    success: true,
    data: updatedTicket,
    message: `Ticket ${updatedTicket.ticket_number} called to ${window?.id}`
  })
})
