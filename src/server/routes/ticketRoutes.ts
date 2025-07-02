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
  createNetworkPrintTicket,
  updatePrintStatus,
  getStatistics
} from '../controllers/ticketController'

const router = Router()

// POST /api/tickets - Create a new ticket
router.post('/', createTicket)

// 🚀 NEW: POST /api/tickets/network-print - Create ticket with network printing
router.post('/network-print', createNetworkPrintTicket)

// 🔄 NEW: PUT /api/tickets/:id/print-status - Update print status
router.put('/:id/print-status', updatePrintStatus)

// POST /api/tickets/call - Call a ticket
router.post('/call', callTicket)

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

// GET /api/tickets/service/:serviceId - Get tickets by service
router.get('/service/:serviceId', getTicketsByService)

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id', getTicketById)

// PATCH /api/tickets/:id - Update ticket status (RESTful approach)
router.patch('/:id', updateTicketStatus)

// PUT /api/tickets/:id/status - Update ticket status
router.put('/:id/status', updateTicketStatus)

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', deleteTicket)

export default router
