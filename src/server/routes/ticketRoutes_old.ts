import { Router } from 'express'
import {
  createTicket,
  callTicket,
  getAllTickets,
  getTicketById,
  getPendingTickets,
  getTicketsByService,
  updateTicketStatus,
  deleteTicket,
  getStatistics,
  getQueueStatus,
  getRecentTickets,
  getSystemStats,
  callNextTicket,
  callNextTicketForWindow,
  updatePrintStatus
} from '../controllers/ticketController'

const router = Router()

// POST /api/tickets - Create a new ticket
router.post('/', createTicket)

// POST /api/tickets/call - Call a ticket
router.post('/call', callTicket)

// POST /api/tickets/call-next - Call next ticket in queue
router.post('/call-next', callNextTicket)

// POST /api/tickets/call-next-for-window - Call next ticket for specific window
router.post('/call-next-for-window', callNextTicketForWindow)

// POST /api/tickets/reset - Reset all tickets (admin only)
router.post('/reset', (req, res) => {
  try {
    const { ticketOperations } = require('../db')
    const deletedCount = ticketOperations.deleteAll()

    res.json({
      success: true,
      message: 'All tickets reset successfully',
      deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset tickets',
      timestamp: new Date().toISOString()
    })
  }
})

// PATCH /api/tickets/:id/call - Call a specific ticket (RESTful approach)
router.patch('/:id/call', (req, res, next) => {
  // Convert the route param to body param for the controller
  req.body.ticket_id = parseInt(req.params.id)
  callTicket(req, res, next)
})

// GET /api/tickets - Get all tickets
router.get('/', getAllTickets)

// GET /api/tickets/statistics - Get system statistics
router.get('/statistics', getStatistics)

// GET /api/tickets/pending - Get pending tickets
router.get('/pending', getPendingTickets)

// GET /api/tickets/recent - Get recent tickets
router.get('/recent', getRecentTickets)

// GET /api/tickets/service/:serviceId - Get tickets by service
router.get('/service/:serviceId', getTicketsByService)

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id', getTicketById)

// PATCH /api/tickets/:id - Update ticket status (RESTful approach)
router.patch('/:id', updateTicketStatus)

// PUT /api/tickets/:id/serve - Mark ticket as served
router.put('/:id/serve', (req, res, next) => {
  req.body.status = 'served'
  updateTicketStatus(req, res, next)
})

// PUT /api/tickets/:id/status - Update ticket status
router.put('/:id/status', updateTicketStatus)

// PUT /api/tickets/:id/print-status - Update print status
router.put('/:id/print-status', updatePrintStatus)

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', deleteTicket)

export default router
