"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticketController_1 = require("../controllers/ticketController");
const router = (0, express_1.Router)();
router.post('/', ticketController_1.createTicket);
router.post('/call', ticketController_1.callTicket);
router.post('/call-next', ticketController_1.callNextTicket);
router.post('/call-next-for-window', ticketController_1.callNextTicketForWindow);
router.post('/reset', (req, res) => {
    try {
        const { ticketOperations } = require('../db');
        const deletedCount = ticketOperations.deleteAll();
        res.json({
            success: true,
            message: 'All tickets reset successfully',
            deletedCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset tickets',
            timestamp: new Date().toISOString()
        });
    }
});
router.patch('/:id/call', (req, res, next) => {
    req.body.ticket_id = parseInt(req.params.id);
    (0, ticketController_1.callTicket)(req, res, next);
});
router.get('/', ticketController_1.getAllTickets);
router.get('/statistics', ticketController_1.getStatistics);
router.get('/pending', ticketController_1.getPendingTickets);
router.get('/recent', ticketController_1.getRecentTickets);
router.get('/service/:serviceId', ticketController_1.getTicketsByService);
router.get('/:id', ticketController_1.getTicketById);
router.patch('/:id', ticketController_1.updateTicketStatus);
router.put('/:id/serve', (req, res, next) => {
    req.body.status = 'served';
    (0, ticketController_1.updateTicketStatus)(req, res, next);
});
router.put('/:id/status', ticketController_1.updateTicketStatus);
router.put('/:id/print-status', ticketController_1.updatePrintStatus);
router.delete('/:id', ticketController_1.deleteTicket);
exports.default = router;
