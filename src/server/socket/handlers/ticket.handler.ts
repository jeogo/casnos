import { Socket } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../socket.config';
import { ticketOperations, serviceOperations } from '../../db/operations';
import { emitToAll, emitToRoom } from '../socket.instance';

// إدارة أحداث التذاكر
export function handleTicketEvents(socket: Socket): void {
  // 1. إنشاء تذكرة جديدة
  socket.on('ticket:create', async (data) => {
    try {
      const { service_id, serviceId, printerId, device_id } = data;
      const actualServiceId = service_id || serviceId;

      // التحقق من الخدمة
      const service = serviceOperations.getById(actualServiceId);
      if (!service) {
        socket.emit('ticket:error', { message: 'Service not found' });
        return;
      }

      // إنشاء تذكرة جديدة
      const ticket = ticketOperations.create({
        service_id: actualServiceId,
        status: 'pending',
      });

      // إرسال التأكيد للعميل
      socket.emit('ticket:created', {
        success: true,
        ticket,
        timestamp: new Date().toISOString()
      });

      // تحديث جميع العملاء المتصلين
      emitToAll('ticket:created', {
        success: true,
        ticket,
        timestamp: new Date().toISOString()
      });

      // تحديث شاشات العرض
      emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:queue-update', {
        action: 'new_ticket',
        ticket,
        timestamp: new Date().toISOString()
      });

      // تحديث قوائل الانتظار
      emitToAll('queue:update', {
        pending: ticketOperations.getPendingTickets().length,
        total: ticketOperations.getAll().length,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Ticket created: ${ticket.ticket_number} for service ${service.name}`);

    } catch (error) {
      console.error('Error creating ticket:', error);
      socket.emit('ticket:error', { message: 'Failed to create ticket' });
    }
  });

  // 2. استدعاء تذكرة
  socket.on('ticket:call', async (data) => {
    try {
      const { ticketId, windowId, employeeId } = data;

      // تحديث حالة التذكرة
      const ticket = ticketOperations.updateStatus(ticketId, 'called', windowId);
      if (!ticket) {
        socket.emit('ticket:error', { message: 'Ticket not found' });
        return;
      }

      // إرسال التحديث لشاشات العرض
      emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
        ticket,
        windowId,
        timestamp: new Date().toISOString()
      });

      // تشغيل النظام الصوتي
      emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:play-sound', {
        ticketNumber: ticket.ticket_number,
        windowNumber: windowId
      });

      socket.emit('ticket:called-success', { ticket });

    } catch (error) {
      console.error('Error calling ticket:', error);
      socket.emit('ticket:error', { message: 'Failed to call ticket' });
    }
  });

  // 3. إنهاء خدمة وطلب التالية
  socket.on('ticket:serve-and-next', async (data) => {
    try {
      const { currentTicketId, windowId, serviceId, employeeId } = data;

      // إنهاء الخدمة الحالية
      if (currentTicketId) {
        const served = ticketOperations.updateStatus(currentTicketId, 'served');
        if (!served) {
          socket.emit('ticket:error', { message: 'Current ticket not found' });
          return;
        }
      }

      // البحث عن التذكرة التالية
      const pendingTickets = ticketOperations.getPendingTickets()
        .filter(t => t.service_id === serviceId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const nextTicket = pendingTickets[0];

      if (nextTicket) {
        // استدعاء التذكرة التالية تلقائياً
        const called = ticketOperations.updateStatus(nextTicket.id, 'called', windowId);

        if (called) {
          // إرسال التحديثات
          emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
            ticket: called,
            windowId,
            timestamp: new Date().toISOString()
          });

          socket.emit('ticket:next', { ticket: called });

          // تشغيل النظام الصوتي
          emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:play-sound', {
            ticketNumber: called.ticket_number,
            windowNumber: windowId
          });
        } else {
          socket.emit('ticket:error', { message: 'Failed to call next ticket' });
        }
      } else {
        socket.emit('ticket:next', { ticket: null });
      }

    } catch (error) {
      console.error('Error in serve and next:', error);
      socket.emit('ticket:error', { message: 'Failed to process serve and next' });
    }
  });

  // 4. استدعاء التذكرة التالية
  socket.on('ticket:call-next', async (data) => {
    try {
      const { window_label, employee_id } = data;

      // الحصول على التذكرة التالية
      const pendingTickets = ticketOperations.getPendingTickets();

      if (pendingTickets.length === 0) {
        socket.emit('ticket:called', {
          success: false,
          message: 'No pending tickets',
          ticket: null
        });
        return;
      }

      // ترتيب التذاكر حسب وقت الإنشاء
      const sortedTickets = pendingTickets.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const nextTicket = sortedTickets[0];

      // تحديث حالة التذكرة
      const calledTicket = ticketOperations.updateStatus(nextTicket!?.id, 'called', window_label);

      if (calledTicket) {
        // إرسال التحديث للموظف
        socket.emit('ticket:called', {
          success: true,
          ticket: calledTicket,
          timestamp: new Date().toISOString()
        });

        // إرسال التحديث لجميع الأجهزة
        emitToAll('ticket:called', {
          success: true,
          ticket: calledTicket,
          timestamp: new Date().toISOString()
        });

        // تحديث شاشات العرض
        emitToRoom(SOCKET_ROOMS.DISPLAYS, 'display:ticket-called', {
          ticket: calledTicket,
          windowId: window_label,
          timestamp: new Date().toISOString()
        });

        // تحديث قوائل الانتظار
        emitToAll('queue:update', {
          pending: ticketOperations.getPendingTickets().length,
          total: ticketOperations.getAll().length,
          timestamp: new Date().toISOString()
        });

        console.log(`📢 Ticket called: ${calledTicket.ticket_number} → ${window_label}`);
      } else {
        socket.emit('ticket:called', {
          success: false,
          message: 'Failed to call ticket'
        });
      }

    } catch (error) {
      console.error('Error calling next ticket:', error);
      socket.emit('ticket:called', {
        success: false,
        message: 'Failed to call next ticket'
      });
    }
  });

  // 5. إنهاء خدمة التذكرة
  socket.on('ticket:serve', async (data) => {
    try {
      const { ticket_id, window_label, employee_id } = data;

      // تحديث حالة التذكرة إلى مُقدمة
      const servedTicket = ticketOperations.updateStatus(ticket_id, 'served', window_label);

      if (servedTicket) {
        // إرسال التحديث للموظف
        socket.emit('ticket:served', {
          success: true,
          ticket: servedTicket,
          timestamp: new Date().toISOString()
        });

        // إرسال التحديث لجميع الأجهزة
        emitToAll('ticket:served', {
          success: true,
          ticket: servedTicket,
          timestamp: new Date().toISOString()
        });

        // تحديث قوائل الانتظار
        emitToAll('queue:update', {
          pending: ticketOperations.getPendingTickets().length,
          total: ticketOperations.getAll().length,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Ticket served: ${servedTicket.ticket_number}`);
      } else {
        socket.emit('ticket:served', {
          success: false,
          message: 'Failed to serve ticket'
        });
      }

    } catch (error) {
      console.error('Error serving ticket:', error);
      socket.emit('ticket:served', {
        success: false,
        message: 'Failed to serve ticket'
      });
    }
  });
}
