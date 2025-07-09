"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePrintEvents = handlePrintEvents;
exports.cleanupExpiredPrintRequests = cleanupExpiredPrintRequests;
exports.getPrintStatistics = getPrintStatistics;
const socket_instance_1 = require("../socket.instance");
const pendingPrintRequests = new Map();
function handlePrintEvents(socket) {
    socket.on('print:remote-request', async (data) => {
        try {
            pendingPrintRequests.set(data.id, data);
            const io = (0, socket_instance_1.getSocketIO)();
            if (io) {
                io.emit('print:execute-remote', {
                    ...data,
                    receivedAt: new Date().toISOString()
                });
            }
            socket.emit('print:request-received', {
                requestId: data.id,
                status: 'sent_to_displays',
                message: 'طلب الطباعة تم إرساله إلى أجهزة العرض',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit('print:request-failed', {
                requestId: data.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    });
    socket.on('print:execute-remote', async (data) => {
    });
    socket.on('print:remote-result', async (response) => {
        try {
            pendingPrintRequests.delete(response.requestId);
            const io = (0, socket_instance_1.getSocketIO)();
            if (io) {
                io.emit('print:remote-completed', response);
            }
        }
        catch (error) {
        }
    });
    socket.on('print:get-pending', () => {
        const pendingList = Array.from(pendingPrintRequests.values());
        socket.emit('print:pending-list', {
            count: pendingList.length,
            requests: pendingList,
            timestamp: new Date().toISOString()
        });
    });
    socket.on('print:cancel-request', (requestId) => {
        try {
            const removed = pendingPrintRequests.delete(requestId);
            socket.emit('print:request-cancelled', {
                requestId,
                cancelled: removed,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
        }
    });
}
function cleanupExpiredPrintRequests() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;
    for (const [requestId, request] of pendingPrintRequests) {
        const requestTime = new Date(request.timestamp).getTime();
        if (now - requestTime > maxAge) {
            pendingPrintRequests.delete(requestId);
        }
    }
}
function getPrintStatistics() {
    return {
        pendingRequests: pendingPrintRequests.size,
        totalProcessed: 0,
        lastCleanup: new Date().toISOString()
    };
}
