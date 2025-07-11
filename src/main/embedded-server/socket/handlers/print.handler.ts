/**
 * 🖨️ Print Handler - معالج الطباعة عن بُعد
 * Remote Print Handler for Socket.IO
 *
 * يدير طلبات الطباعة عن بُعد بين Customer Screen و Display Screen
 */

import { Socket } from 'socket.io';
import { getSocketIO } from '../socket.instance';

// واجهات البيانات للطباعة عن بُعد
export interface RemotePrintRequest {
  id: string; // معرف فريد للطلب
  ticketData: {
    ticket_number: string;
    service_name: string;
    created_at: string;
    position?: number;
    window_number?: number;
    printer_id?: string;
  };
  printerId: string;
  printerName: string;
  targetDeviceId?: string; // الجهاز المستهدف (Display)
  sourceDeviceId?: string; // الجهاز المصدر (Customer)
  timestamp: string;
}

export interface RemotePrintResponse {
  requestId: string;
  success: boolean;
  message: string;
  printMethod?: string;
  error?: string;
  timestamp: string;
}

// خريطة طلبات الطباعة المعلقة
const pendingPrintRequests = new Map<string, RemotePrintRequest>();

/**
 * إعداد معالجات أحداث الطباعة عن بُعد
 */
export function handlePrintEvents(socket: Socket): void {
  // طلب طباعة عن بُعد من Customer إلى Display
  socket.on('print:remote-request', async (data: RemotePrintRequest) => {
    try {
      // حفظ الطلب في الذاكرة المؤقتة
      pendingPrintRequests.set(data.id, data);

      // إرسال الطلب إلى جميع أجهزة Display المتصلة
      const io = getSocketIO();
      if (io) {
        io.emit('print:execute-remote', {
          ...data,
          receivedAt: new Date().toISOString()
        });
      }

      // إرسال تأكيد الاستقبال للمرسل
      socket.emit('print:request-received', {
        requestId: data.id,
        status: 'sent_to_displays',
        message: 'طلب الطباعة تم إرساله إلى أجهزة العرض',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      socket.emit('print:request-failed', {
        requestId: data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // تنفيذ الطباعة من جانب Display
  socket.on('print:execute-remote', async (_data: RemotePrintRequest) => {
    // هذا الحدث يُستخدم فقط للتوثيق - التنفيذ الفعلي في DisplayScreen
  });

  // استقبال نتيجة الطباعة من Display
  socket.on('print:remote-result', async (response: RemotePrintResponse) => {
    try {
      // إزالة الطلب من قائمة المعلقة
      pendingPrintRequests.delete(response.requestId);

      // إرسال النتيجة إلى جميع العملاء المهتمين
      const io = getSocketIO();
      if (io) {
        io.emit('print:remote-completed', response);
      }

    } catch (error) {
      // Silent error handling
    }
  });

  // الحصول على قائمة الطلبات المعلقة
  socket.on('print:get-pending', () => {
    const pendingList = Array.from(pendingPrintRequests.values());
    socket.emit('print:pending-list', {
      count: pendingList.length,
      requests: pendingList,
      timestamp: new Date().toISOString()
    });
  });

  // إلغاء طلب طباعة
  socket.on('print:cancel-request', (requestId: string) => {
    try {
      const removed = pendingPrintRequests.delete(requestId);

      socket.emit('print:request-cancelled', {
        requestId,
        cancelled: removed,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Silent error handling
    }
  });
}

/**
 * تنظيف الطلبات المنتهية الصلاحية
 */
export function cleanupExpiredPrintRequests(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 دقائق

  for (const [requestId, request] of pendingPrintRequests) {
    const requestTime = new Date(request.timestamp).getTime();
    if (now - requestTime > maxAge) {
      pendingPrintRequests.delete(requestId);
    }
  }
}

/**
 * الحصول على إحصائيات الطباعة
 */
export function getPrintStatistics() {
  return {
    pendingRequests: pendingPrintRequests.size,
    totalProcessed: 0, // يمكن تطويرها لاحقاً
    lastCleanup: new Date().toISOString()
  };
}
