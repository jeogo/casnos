// 🖨️ Display Device Process Logic - Network Print Handler
// This module handles incoming print requests from the server and processes them locally

import { Socket } from 'socket.io-client';

export interface PrintJobData {
  ticketId: number;
  ticketData: {
    id: number;
    ticket_number: string;
    service_name: string;
    company_name: string;
    position: number;
    window_number: number;
    created_at: string;
  };
  printerId: string;
  timestamp: number;
}

export interface PrintJobResult {
  success: boolean;
  ticketId: number;
  duration: number;
  error?: string;
  message: string;
}

export class DisplayDevicePrintProcessor {
  private socket: Socket | null = null;
  private deviceId: string;
  private isProcessing: boolean = false;
  private processingQueue: PrintJobData[] = [];

  constructor(deviceId: string = 'display-screen-001') {
    this.deviceId = deviceId;
  }

  /**
   * Initialize the print processor with socket connection
   */
  initialize(socket: Socket): void {
    this.socket = socket;
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO event handlers for print requests
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Handle instant print requests from server
    this.socket.on('instant-print-request', (data: PrintJobData) => {
      this.addToQueue(data);
    });

    // Handle print job cancellation
    this.socket.on('cancel-print-job', (data  : { ticketId: number }) => {
      this.cancelPrintJob(data.ticketId);
    });

    // Acknowledge print job reception
    this.socket.on('print-job-ping', (data: { ticketId: number }) => {
      this.socket?.emit('print-job-pong', {
        ticketId: data.ticketId,
        deviceId: this.deviceId,
        status: 'ready'
      });
    });
  }

  /**
   * Add print job to processing queue
   */
  private addToQueue(printJob: PrintJobData): void {
    this.processingQueue.push(printJob);

    // Send acknowledgment to server
    this.socket?.emit('print-job-received', {
      ticketId: printJob.ticketId,
      deviceId: this.deviceId,
      queuePosition: this.processingQueue.length
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the print job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const printJob = this.processingQueue.shift();
      if (printJob) {
        await this.processPrintJob(printJob);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single print job
   */
  private async processPrintJob(printJob: PrintJobData): Promise<void> {
    const startTime = Date.now();

    try {
      // Simulate print processing (in real implementation, this would call the actual printer)
      const result = await this.performActualPrint(printJob);

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`[DISPLAY-PRINT] ✅ Print job completed successfully in ${duration}ms`);

        // تحديث حالة الطباعة في قاعدة البيانات عبر API بعد نجاح الطباعة
        try {
          const serverInfo = window?.api?.getServerInfo ? (await window.api.getServerInfo()) : null;
          const baseUrl = serverInfo?.ip;
          if (baseUrl) {
            const url = `http://${baseUrl}:3001/api/tickets/${printJob.ticketId}/print-status`;
            const response = await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ print_status: 'printed' })
            });
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[DISPLAY-PRINT] ❌ Failed to update print_status for ticket ${printJob.ticketId}:`, errorText);
            } else {
              console.log(`[DISPLAY-PRINT] ✅ print_status updated to 'printed' for ticket ${printJob.ticketId}`);
            }
          } else {
            console.error('[DISPLAY-PRINT] ❌ No baseUrl found for print status update');
          }
        } catch (err) {
          console.error(`[DISPLAY-PRINT] ❌ Error updating print_status for ticket ${printJob.ticketId}:`, err);
        }

        // Notify server of successful completion
        this.socket?.emit('print-job-completed', {
          ticketId: printJob.ticketId,
          success: true,
          duration,
          deviceId: this.deviceId,
          message: result.message
        });
      } else {
        console.log(`[DISPLAY-PRINT] ❌ Print job failed: ${result.error}`);

        // Notify server of failure
        this.socket?.emit('print-job-completed', {
          ticketId: printJob.ticketId,
          success: false,
          duration,
          deviceId: this.deviceId,
          error: result.error
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[DISPLAY-PRINT] ❌ Print job exception: ${errorMessage}`);

      // Notify server of exception
      this.socket?.emit('print-job-completed', {
        ticketId: printJob.ticketId,
        success: false,
        duration,
        deviceId: this.deviceId,
        error: `Exception: ${errorMessage}`
      });
    }
  }

  /**
   * Perform the actual print operation
   * This is where you would integrate with your actual printing system
   */
  private async performActualPrint(printJob: PrintJobData): Promise<PrintJobResult> {
    const { ticketData, printerId } = printJob;

    try {
      // Simulate print delay (real printer communication)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Simulate printer success/failure (90% success rate for testing)
      const isSuccess = Math.random() > 0.1;

      if (!isSuccess) {
        return {
          success: false,
          ticketId: printJob.ticketId,
          duration: 0,
          error: 'Printer communication failed',
          message: 'Print job failed'
        };
      }

      // Successful print simulation
      console.log(`[DISPLAY-PRINT] 📄 Printing ticket ${ticketData.ticket_number}:`);
      console.log(`   Service: ${ticketData.service_name}`);
      console.log(`   Company: ${ticketData.company_name}`);
      console.log(`   Position: ${ticketData.position}`);
      console.log(`   Window: ${ticketData.window_number}`);
      console.log(`   Printer: ${printerId}`);

      return {
        success: true,
        ticketId: printJob.ticketId,
        duration: 0,
        message: `Ticket ${ticketData.ticket_number} printed successfully on ${printerId}`
      };

    } catch (error) {
      return {
        success: false,
        ticketId: printJob.ticketId,
        duration: 0,
        error: error instanceof Error ? error.message : 'Print failed',
        message: 'Print operation failed'
      };
    }
  }

  /**
   * Cancel a specific print job
   */
  private cancelPrintJob(ticketId: number): void {
    const index = this.processingQueue.findIndex(job => job.ticketId === ticketId);
    if (index !== -1) {
      this.processingQueue.splice(index, 1);
      console.log(`[DISPLAY-PRINT] ❌ Print job ${ticketId} removed from queue`);

      // Notify server of cancellation
      this.socket?.emit('print-job-cancelled', {
        ticketId,
        deviceId: this.deviceId,
        reason: 'Cancelled by request'
      });
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    isProcessing: boolean;
    queueLength: number;
    deviceId: string;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      deviceId: this.deviceId
    };
  }

  /**
   * Emergency stop - clear all queued jobs
   */
  emergencyStop(): void {
    console.log(`[DISPLAY-PRINT] 🚨 Emergency stop - clearing ${this.processingQueue.length} queued jobs`);

    // Notify server about cancelled jobs
    this.processingQueue.forEach(job => {
      this.socket?.emit('print-job-completed', {
        ticketId: job.ticketId,
        success: false,
        duration: 0,
        deviceId: this.deviceId,
        error: 'Emergency stop activated'
      });
    });

    this.processingQueue = [];
    this.isProcessing = false;
  }
}

// Export singleton instance
export const displayPrintProcessor = new DisplayDevicePrintProcessor();
