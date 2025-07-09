"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTicketEvents = handleTicketEvents;
const socket_config_1 = require("../socket.config");
const operations_1 = require("../../db/operations");
const socket_instance_1 = require("../socket.instance");
function handleTicketEvents(socket) {
    socket.on('ticket:create', async (data) => {
        try {
            const { service_id, serviceId, printerId, device_id } = data;
            const actualServiceId = service_id || serviceId;
            const service = operations_1.serviceOperations.getById(actualServiceId);
            if (!service) {
                socket.emit('ticket:error', { message: 'Service not found' });
                return;
            }
            const ticket = operations_1.ticketOperations.create({
                service_id: actualServiceId,
                status: 'pending',
            });
            socket.emit('ticket:created', {
                success: true,
                ticket,
                timestamp: new Date().toISOString()
            });
            (0, socket_instance_1.emitToAll)('ticket:created', {
                success: true,
                ticket,
                timestamp: new Date().toISOString()
            });
            (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:queue-update', {
                action: 'new_ticket',
                ticket,
                timestamp: new Date().toISOString()
            });
            (0, socket_instance_1.emitToAll)('queue:update', {
                pending: operations_1.ticketOperations.getPendingTickets().length,
                total: operations_1.ticketOperations.getAll().length,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit('ticket:error', { message: 'Failed to create ticket' });
        }
    });
    socket.on('ticket:call', async (data) => {
        try {
            const { ticketId, windowId } = data;
            const ticket = operations_1.ticketOperations.updateStatus(ticketId, 'called', windowId);
            if (!ticket) {
                socket.emit('ticket:error', { message: 'Ticket not found' });
                return;
            }
            (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
                ticket,
                windowId,
                timestamp: new Date().toISOString()
            });
            (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:play-sound', {
                ticketNumber: ticket.ticket_number,
                windowNumber: windowId
            });
            socket.emit('ticket:called-success', { ticket });
        }
        catch (error) {
            socket.emit('ticket:error', { message: 'Failed to call ticket' });
        }
    });
    socket.on('ticket:serve-and-next', async (data) => {
        try {
            const { currentTicketId, windowId, serviceId } = data;
            if (currentTicketId) {
                const served = operations_1.ticketOperations.updateStatus(currentTicketId, 'served');
                if (!served) {
                    socket.emit('ticket:error', { message: 'Current ticket not found' });
                    return;
                }
            }
            const pendingTickets = operations_1.ticketOperations.getPendingTickets()
                .filter(t => t.service_id === serviceId)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const nextTicket = pendingTickets[0];
            if (nextTicket) {
                const called = operations_1.ticketOperations.updateStatus(nextTicket.id, 'called', windowId);
                if (called) {
                    (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
                        ticket: called,
                        windowId,
                        timestamp: new Date().toISOString()
                    });
                    socket.emit('ticket:next', { ticket: called });
                    (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:play-sound', {
                        ticketNumber: called.ticket_number,
                        windowNumber: windowId
                    });
                }
                else {
                    socket.emit('ticket:error', { message: 'Failed to call next ticket' });
                }
            }
            else {
                socket.emit('ticket:next', { ticket: null });
            }
        }
        catch (error) {
            socket.emit('ticket:error', { message: 'Failed to process serve and next' });
        }
    });
    socket.on('ticket:call-next', async (data) => {
        try {
            const { window_label } = data;
            const pendingTickets = operations_1.ticketOperations.getPendingTickets();
            if (pendingTickets.length === 0) {
                socket.emit('ticket:called', {
                    success: false,
                    message: 'No pending tickets',
                    ticket: null
                });
                return;
            }
            const sortedTickets = pendingTickets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const nextTicket = sortedTickets[0];
            const calledTicket = operations_1.ticketOperations.updateStatus(nextTicket?.id, 'called', window_label);
            if (calledTicket) {
                socket.emit('ticket:called', {
                    success: true,
                    ticket: calledTicket,
                    timestamp: new Date().toISOString()
                });
                (0, socket_instance_1.emitToAll)('ticket:called', {
                    success: true,
                    ticket: calledTicket,
                    timestamp: new Date().toISOString()
                });
                (0, socket_instance_1.emitToRoom)(socket_config_1.SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
                    ticket: calledTicket,
                    windowId: window_label,
                    timestamp: new Date().toISOString()
                });
                (0, socket_instance_1.emitToAll)('queue:update', {
                    pending: operations_1.ticketOperations.getPendingTickets().length,
                    total: operations_1.ticketOperations.getAll().length,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                socket.emit('ticket:called', {
                    success: false,
                    message: 'Failed to call ticket'
                });
            }
        }
        catch (error) {
            socket.emit('ticket:called', {
                success: false,
                message: 'Failed to call next ticket'
            });
        }
    });
    socket.on('ticket:serve', async (data) => {
        try {
            const { ticket_id, window_label } = data;
            const servedTicket = operations_1.ticketOperations.updateStatus(ticket_id, 'served', window_label);
            if (servedTicket) {
                socket.emit('ticket:served', {
                    success: true,
                    ticket: servedTicket,
                    timestamp: new Date().toISOString()
                });
                (0, socket_instance_1.emitToAll)('ticket:served', {
                    success: true,
                    ticket: servedTicket,
                    timestamp: new Date().toISOString()
                });
                (0, socket_instance_1.emitToAll)('queue:update', {
                    pending: operations_1.ticketOperations.getPendingTickets().length,
                    total: operations_1.ticketOperations.getAll().length,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                socket.emit('ticket:served', {
                    success: false,
                    message: 'Failed to serve ticket'
                });
            }
        }
        catch (error) {
            socket.emit('ticket:served', {
                success: false,
                message: 'Failed to serve ticket'
            });
        }
    });
}
