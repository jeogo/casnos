"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callNextTicketForWindow = exports.callNextTicket = exports.getStatistics = exports.updatePrintStatus = exports.createNetworkPrintTicket = exports.getSystemStats = exports.getRecentTickets = exports.getQueueStatus = exports.deleteTicket = exports.updateTicketStatus = exports.getTicketsByService = exports.getTicketsByPrintStatus = exports.getPendingTickets = exports.getTicketById = exports.getAllTickets = exports.callTicket = exports.createTicket = void 0;
const db_1 = require("../db");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const instantPrintSentTickets = new Map();
setInterval(() => {
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    for (const [ticketId, info] of instantPrintSentTickets.entries()) {
        if (info.timestamp < tenMinutesAgo) {
            instantPrintSentTickets.delete(ticketId);
        }
    }
}, 10 * 60 * 1000);
exports.createTicket = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { service_id, print_type } = req.body;
    if (!service_id || typeof service_id !== 'number') {
        throw (0, errorMiddleware_1.createError)('Valid numeric service ID is required', 400);
    }
    const service = db_1.serviceOperations.getById(service_id);
    if (!service) {
        throw (0, errorMiddleware_1.createError)(`Service with ID ${service_id} not found`, 404);
    }
    const initialPrintStatus = print_type === 'local' ? 'printing' : 'pending';
    const newTicket = db_1.ticketOperations.create({
        service_id: service_id,
        status: 'pending',
        print_status: initialPrintStatus
    });
    const { getSocketIO } = require('../socket/socket.instance');
    const io = getSocketIO();
    if (io) {
        io.emit('ticket:created', {
            ticket: newTicket,
            service_name: service.name,
            ticket_number: newTicket.ticket_number,
            timestamp: new Date().toISOString()
        });
        if (newTicket.print_status === 'pending' && !instantPrintSentTickets.has(newTicket.id)) {
            console.log(`⚡ NETWORK PRINTER: Sending ticket #${newTicket.ticket_number} to DisplayScreen for instant printing`);
            io.to('displays').emit('print:pending-instant', {
                ticket: newTicket,
                ticketData: {
                    id: newTicket.id,
                    ticket_number: newTicket.ticket_number,
                    service_id: newTicket.service_id,
                    service_name: service.name,
                    created_at: newTicket.created_at,
                    company_name: "",
                    position: 1,
                    print_source: 'display'
                },
                timestamp: new Date().toISOString()
            });
            instantPrintSentTickets.set(newTicket.id, {
                timestamp: Date.now(),
                source: 'createTicket-network'
            });
        }
        else if (newTicket.print_status === 'printing') {
            console.log(`🏠 LOCAL PRINTER: Ticket #${newTicket.ticket_number} will be handled by CustomerScreen only - DisplayScreen skipped`);
        }
        else {
            const existingInfo = instantPrintSentTickets.get(newTicket.id);
            console.log(`⚠️ DUPLICATE PREVENTED: Ticket #${newTicket.ticket_number} already sent for instant printing from ${existingInfo?.source}`);
        }
        const pendingCount = db_1.ticketOperations.getPendingTickets().length;
        io.emit('queue:updated', {
            pending: pendingCount,
            total: db_1.ticketOperations.getAll().length,
            timestamp: new Date().toISOString()
        });
    }
    res.status(201).json({
        success: true,
        data: newTicket,
        message: 'Ticket created successfully'
    });
});
exports.callTicket = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { ticket_id, window_id } = req.body;
    if (!ticket_id) {
        throw (0, errorMiddleware_1.createError)('Ticket ID is required', 400);
    }
    if (!window_id) {
        throw (0, errorMiddleware_1.createError)('Window ID is required', 400);
    }
    const ticket = db_1.ticketOperations.getById(ticket_id);
    if (!ticket) {
        throw (0, errorMiddleware_1.createError)('Ticket not found', 404);
    }
    if (ticket.status !== 'pending') {
        throw (0, errorMiddleware_1.createError)('Ticket is not in pending status', 400);
    }
    const updatedTicket = db_1.ticketOperations.updateStatus(ticket_id, 'called', window_id);
    if (!updatedTicket) {
        throw (0, errorMiddleware_1.createError)('Failed to update ticket', 500);
    }
    const service = db_1.serviceOperations.getById(updatedTicket.service_id);
    const window = db_1.windowOperations.getById(window_id);
    const { getSocketIO } = require('../socket/socket.instance');
    const io = getSocketIO();
    if (io) {
        io.emit('ticket:called', {
            ticket: updatedTicket,
            ticket_number: updatedTicket.ticket_number,
            service_name: service?.name || 'Unknown Service',
            window_id: window_id,
            window_number: window?.id || window_id,
            timestamp: new Date().toISOString()
        });
        io.emit('display:ticket-called', {
            ticket_number: updatedTicket.ticket_number,
            service_name: service?.name || 'Unknown Service',
            window_id: window_id,
            status: 'called',
            timestamp: new Date().toISOString()
        });
        const pendingCount = db_1.ticketOperations.getPendingTickets().length;
        const calledCount = db_1.ticketOperations.getAll().filter(t => t.status === 'called').length;
        io.emit('queue:updated', {
            pending: pendingCount,
            called: calledCount,
            total: db_1.ticketOperations.getAll().length,
            timestamp: new Date().toISOString()
        });
    }
    res.json({
        success: true,
        data: updatedTicket,
        message: `Ticket ${updatedTicket.ticket_number} called to window ${window_id}`
    });
});
exports.getAllTickets = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const tickets = db_1.ticketOperations.getAll();
    res.json({
        success: true,
        count: tickets.length,
        data: tickets
    });
});
exports.getTicketById = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) {
        throw (0, errorMiddleware_1.createError)('Invalid ticket ID', 400);
    }
    const ticket = db_1.ticketOperations.getById(ticketId);
    if (!ticket) {
        throw (0, errorMiddleware_1.createError)('Ticket not found', 404);
    }
    res.json({
        success: true,
        data: ticket
    });
});
exports.getPendingTickets = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const tickets = db_1.ticketOperations.getPendingTickets();
    res.json({
        success: true,
        count: tickets.length,
        data: tickets
    });
});
exports.getTicketsByPrintStatus = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const printStatus = req.params.printStatus;
    if (!['pending', 'printing', 'printed', 'print_failed'].includes(printStatus)) {
        res.status(400).json({
            success: false,
            error: 'Invalid print status. Must be: pending, printing, printed, or print_failed'
        });
        return;
    }
    const tickets = db_1.ticketOperations.getAll().filter(ticket => ticket.print_status === printStatus);
    res.json({
        success: true,
        count: tickets.length,
        data: tickets
    });
});
exports.getTicketsByService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    const tickets = db_1.ticketOperations.getByServiceId(serviceId);
    res.json({
        success: true,
        count: tickets.length,
        data: tickets
    });
});
exports.updateTicketStatus = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const ticketId = parseInt(req.params.id);
    const { status, window_id } = req.body;
    if (isNaN(ticketId)) {
        throw (0, errorMiddleware_1.createError)('Invalid ticket ID', 400);
    }
    if (!status) {
        throw (0, errorMiddleware_1.createError)('Status is required', 400);
    }
    const validStatuses = ['pending', 'called', 'served'];
    if (!validStatuses.includes(status)) {
        throw (0, errorMiddleware_1.createError)('Invalid status', 400);
    }
    const updatedTicket = db_1.ticketOperations.updateStatus(ticketId, status, window_id);
    if (!updatedTicket) {
        throw (0, errorMiddleware_1.createError)('Ticket not found or failed to update', 404);
    }
    const { getSocketIO } = require('../socket/socket.instance');
    const io = getSocketIO();
    if (io) {
        const service = db_1.serviceOperations.getById(updatedTicket.service_id);
        io.emit('ticket:status-updated', {
            ticket: updatedTicket,
            ticket_number: updatedTicket.ticket_number,
            service_name: service?.name || 'Unknown Service',
            old_status: 'previous',
            new_status: status,
            window_id: window_id,
            timestamp: new Date().toISOString()
        });
        if (status === 'served') {
            io.emit('ticket:served', {
                ticket: updatedTicket,
                ticket_number: updatedTicket.ticket_number,
                service_name: service?.name || 'Unknown Service',
                window_id: window_id,
                timestamp: new Date().toISOString()
            });
        }
        const allTickets = db_1.ticketOperations.getAll();
        const pendingCount = allTickets.filter(t => t.status === 'pending').length;
        const calledCount = allTickets.filter(t => t.status === 'called').length;
        const servedCount = allTickets.filter(t => t.status === 'served').length;
        io.emit('queue:updated', {
            pending: pendingCount,
            called: calledCount,
            served: servedCount,
            total: allTickets.length,
            timestamp: new Date().toISOString()
        });
    }
    res.json({
        success: true,
        data: updatedTicket,
        message: `Ticket ${updatedTicket.ticket_number} status updated to ${status}`
    });
});
exports.deleteTicket = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) {
        throw (0, errorMiddleware_1.createError)('Invalid ticket ID', 400);
    }
    const deleted = db_1.ticketOperations.delete(ticketId);
    if (!deleted) {
        throw (0, errorMiddleware_1.createError)('Ticket not found', 404);
    }
    res.json({
        success: true,
        message: 'Ticket deleted successfully'
    });
});
exports.getQueueStatus = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const pendingTickets = db_1.ticketOperations.getPendingTickets();
    const allTickets = db_1.ticketOperations.getAll();
    const stats = {
        pending: pendingTickets.length,
        total: allTickets.length,
        served: allTickets.filter(t => t.status === 'served').length,
        called: allTickets.filter(t => t.status === 'called').length
    };
    res.json({
        success: true,
        data: {
            stats,
            pendingTickets,
            timestamp: new Date().toISOString()
        }
    });
});
exports.getRecentTickets = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const allTickets = db_1.ticketOperations.getAll();
    const recentTickets = allTickets
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    res.json({
        success: true,
        count: recentTickets.length,
        data: recentTickets
    });
});
exports.getSystemStats = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const allTickets = db_1.ticketOperations.getAll();
    const pendingTickets = db_1.ticketOperations.getPendingTickets();
    const today = new Date().toDateString();
    const todayTickets = allTickets.filter(ticket => new Date(ticket.created_at).toDateString() === today);
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
    };
    res.json({
        success: true,
        data: stats
    });
});
exports.createNetworkPrintTicket = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { service_id, ticketData } = req.body;
    if (!service_id) {
        throw (0, errorMiddleware_1.createError)('Service ID is required', 400);
    }
    const service = db_1.serviceOperations.getById(service_id);
    if (!service) {
        throw (0, errorMiddleware_1.createError)('Service not found', 404);
    }
    try {
        const newTicket = db_1.ticketOperations.create({
            service_id: service_id,
            status: 'pending',
            print_status: 'pending'
        });
        res.status(201).json({
            success: true,
            ticket: newTicket,
            message: 'Ticket created successfully'
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to create ticket', 500);
    }
});
exports.updatePrintStatus = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const ticketId = parseInt(req.params.id);
    const { print_status, error_message } = req.body;
    if (isNaN(ticketId)) {
        throw (0, errorMiddleware_1.createError)('Invalid ticket ID', 400);
    }
    if (!print_status || !['pending', 'printing', 'printed', 'print_failed'].includes(print_status)) {
        throw (0, errorMiddleware_1.createError)('Invalid print status', 400);
    }
    const updatedTicket = db_1.ticketOperations.updatePrintStatus(ticketId, print_status);
    if (!updatedTicket) {
        throw (0, errorMiddleware_1.createError)('Ticket not found', 404);
    }
    const { getSocketIO } = require('../socket/socket.instance');
    const io = getSocketIO();
    if (io) {
        io.emit('print:status-updated', {
            ticket: updatedTicket,
            ticket_number: updatedTicket.ticket_number,
            print_status,
            error_message,
            timestamp: new Date().toISOString()
        });
        if (print_status === 'pending' && !instantPrintSentTickets.has(updatedTicket.id)) {
            console.log(`⚡ RE-PRINT REQUEST: Ticket #${updatedTicket.ticket_number} status changed to pending - sending to DisplayScreen`);
            const service = db_1.serviceOperations.getById(updatedTicket.service_id);
            io.to('displays').emit('print:pending-instant', {
                ticket: updatedTicket,
                ticketData: {
                    id: updatedTicket.id,
                    ticket_number: updatedTicket.ticket_number,
                    service_id: updatedTicket.service_id,
                    service_name: service?.name || 'خدمة',
                    created_at: updatedTicket.created_at,
                    company_name: "",
                    position: 1,
                    print_source: 'display'
                },
                timestamp: new Date().toISOString()
            });
            instantPrintSentTickets.set(updatedTicket.id, {
                timestamp: Date.now(),
                source: 'updatePrintStatus-reprint'
            });
            console.log(`⚡ RE-PRINT: Ticket #${updatedTicket.ticket_number} sent to DisplayScreen for re-printing`);
        }
        else if (print_status === 'pending') {
            const existingInfo = instantPrintSentTickets.get(updatedTicket.id);
            console.log(`⚠️ DUPLICATE PREVENTED: Ticket #${updatedTicket.ticket_number} already sent for instant printing from ${existingInfo?.source} at ${new Date(existingInfo?.timestamp || 0).toISOString()}`);
        }
        if (print_status === 'printed' || print_status === 'print_failed') {
            instantPrintSentTickets.delete(updatedTicket.id);
            console.log(`🧹 CLEANUP: Removed ticket #${updatedTicket.ticket_number} from tracking (status: ${print_status})`);
        }
        if (print_status === 'printed' && updatedTicket.status === 'pending') {
            const service = db_1.serviceOperations.getById(updatedTicket.service_id);
            console.log(`🎫 Ticket #${updatedTicket.ticket_number} printed - notified service windows for ${service?.name}`);
        }
    }
    res.json({
        success: true,
        ticket: updatedTicket,
        message: `Print status updated to ${print_status}`
    });
});
exports.getStatistics = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    try {
        const allTickets = db_1.ticketOperations.getAll();
        const allServices = db_1.serviceOperations.getAll();
        const allWindows = db_1.windowOperations.getAll();
        const today = new Date().toDateString();
        const todayTickets = allTickets.filter(ticket => new Date(ticket.created_at).toDateString() === today);
        const pendingTickets = db_1.ticketOperations.getPendingTickets();
        const activeWindows = db_1.windowOperations.getActiveWindows();
        const statistics = {
            tickets: {
                total: allTickets.length,
                today: todayTickets.length,
                pending: pendingTickets.length,
                served: allTickets.filter(t => t.status === 'served').length
            },
            services: {
                total: allServices.length,
                active: allServices.length
            },
            windows: {
                total: allWindows.length,
                active: activeWindows.length,
                inactive: allWindows.length - activeWindows.length
            }
        };
        res.json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to get statistics', 500);
    }
});
exports.callNextTicket = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { window_id } = req.body;
    if (!window_id) {
        throw (0, errorMiddleware_1.createError)('Window ID is required', 400);
    }
    const pendingTickets = db_1.ticketOperations.getPendingTickets();
    if (pendingTickets.length === 0) {
        res.json({
            success: false,
            message: 'No pending tickets',
            data: null
        });
        return;
    }
    const sortedTickets = pendingTickets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const nextTicket = sortedTickets[0];
    if (!nextTicket) {
        res.json({
            success: false,
            message: 'No pending tickets available',
            data: null
        });
        return;
    }
    const updatedTicket = db_1.ticketOperations.updateStatus(nextTicket.id, 'called', window_id);
    if (!updatedTicket) {
        throw (0, errorMiddleware_1.createError)('Failed to call ticket', 500);
    }
    const window = db_1.windowOperations.getById(window_id);
    res.json({
        success: true,
        data: updatedTicket,
        message: `Ticket ${updatedTicket.ticket_number} called to ${window?.id}`
    });
});
exports.callNextTicketForWindow = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { window_id, service_id, current_ticket_id } = req.body;
    if (!window_id) {
        throw (0, errorMiddleware_1.createError)('Window ID is required', 400);
    }
    if (current_ticket_id) {
        console.log(`🏁 SERVING current ticket: ${current_ticket_id} at window ${window_id}`);
        const servedTicket = db_1.ticketOperations.updateStatus(current_ticket_id, 'served', window_id);
        if (servedTicket) {
            console.log(`✅ Current ticket ${servedTicket.ticket_number} marked as served`);
        }
    }
    let pendingTickets = db_1.ticketOperations.getPendingTickets();
    if (service_id) {
        pendingTickets = pendingTickets.filter(ticket => ticket.service_id === service_id);
        console.log(`🔍 Looking for next ticket in service ${service_id}, found ${pendingTickets.length} pending`);
    }
    if (pendingTickets.length === 0) {
        res.json({
            success: false,
            message: service_id ? 'No pending tickets for this service' : 'No pending tickets',
            data: null
        });
        return;
    }
    const sortedTickets = pendingTickets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const nextTicket = sortedTickets[0];
    console.log(`📢 CALLING next ticket: ${nextTicket?.ticket_number} to window ${window_id}`);
    const calledTicket = db_1.ticketOperations.updateStatus(nextTicket.id, 'called', window_id);
    if (!calledTicket) {
        throw (0, errorMiddleware_1.createError)('Failed to call next ticket', 500);
    }
    const { getSocketIO } = require('../socket/socket.instance');
    const io = getSocketIO();
    if (io) {
        const service = db_1.serviceOperations.getById(calledTicket.service_id);
        io.emit('ticket:called', {
            ticket: calledTicket,
            ticket_number: calledTicket.ticket_number,
            service_name: service?.name || 'Unknown Service',
            window_id: window_id,
            window_number: window_id,
            timestamp: new Date().toISOString()
        });
        io.to('displays').emit('display:ticket-called', {
            ticket_number: calledTicket.ticket_number,
            service_name: service?.name || 'Unknown Service',
            window_id: window_id,
            status: 'called',
            timestamp: new Date().toISOString()
        });
        io.to('displays').emit('audio:play-announcement', {
            ticketNumber: calledTicket.ticket_number,
            windowLabel: `شباك ${window_id}`,
            timestamp: new Date().toISOString()
        });
        console.log(`🔊 Audio announcement requested for ticket ${calledTicket.ticket_number} → شباك ${window_id}`);
    }
    res.json({
        success: true,
        data: calledTicket,
        message: `Ticket ${calledTicket.ticket_number} called to window ${window_id}`
    });
});
