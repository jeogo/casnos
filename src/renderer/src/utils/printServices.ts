// Print services for renderer process
export interface TicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
  printer_id?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  printer?: string;
  pdfPath?: string | null;
}

export interface PrintPreferences {
  printerName?: string;
  copies?: number;
  generatePDF?: boolean;
  silent?: boolean;
}

class PrintServices {
  // Print ticket with specific printer
  async printTicket(ticketData: TicketData, printerName?: string): Promise<PrintResult> {
    try {
      const result = await window.api.printTicket(ticketData, printerName);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate PDF for ticket
  async generatePDF(ticketData: TicketData, outputPath?: string): Promise<PrintResult> {
    try {
      const result = await window.api.generatePDF(ticketData, outputPath);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all available printers (both system and Electron)
  async getAllPrinters(): Promise<any[]> {
    try {
      const printers = await window.api.getAllPrinters();
      return printers || [];
    } catch (error) {
      return [];
    }
  }

  // Test printer functionality
  async testPrinter(printerName?: string): Promise<PrintResult> {
    try {
      const result = await window.api.testPrinter(printerName);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Smart print with automatic printer selection and preferences
  async smartPrint(ticketData: TicketData, preferences: PrintPreferences = {}): Promise<PrintResult> {
    try {
      const result = await window.api.smartPrintTicket(ticketData, preferences);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ⚡ INSTANT PRINT - One-shot ticket creation and printing
  async instantPrint(ticketData: TicketData, printerName?: string): Promise<PrintResult> {
    try {
      // INSTANT PRINT initiated

      // Use smart print for fastest results
      const result = await this.smartPrint(ticketData, {
        printerName: printerName,
        generatePDF: true,
        silent: false
      });

      if (result.success) {
        // INSTANT PRINT completed successfully
      } else {
        // INSTANT PRINT had issues
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Instant print error'
      };
    }
  }

  // Auto-print after ticket creation - for immediate workflow
  async autoProcessTicket(_serviceId: number, serviceName: string, printerName?: string): Promise<{
    ticketCreated: boolean;
    pdfGenerated: boolean;
    printed: boolean;
    ticketData?: TicketData;
    errors?: string[];
  }> {
    const errors: string[] = [];
    let ticketData: TicketData | undefined;

    try {
      // AUTO-PROCESS: Creating ticket for service

      // This would need to be implemented based on your ticket creation API
      // For now, creating a sample ticket structure
      const currentTime = new Date().toISOString();
      const ticketNumber = `${Date.now()}`.slice(-6); // Simple ticket number

      ticketData = {
        ticket_number: ticketNumber,
        service_name: serviceName,
        created_at: currentTime,
        printer_id: printerName
      };

      // Ticket created

      // Instant print the created ticket
      const printResult = await this.instantPrint(ticketData, printerName);

      return {
        ticketCreated: true,
        pdfGenerated: printResult.success && !!printResult.pdfPath,
        printed: printResult.success,
        ticketData: ticketData,
        errors: printResult.success ? [] : [printResult.message]
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);

      return {
        ticketCreated: !!ticketData,
        pdfGenerated: false,
        printed: false,
        ticketData: ticketData,
        errors: errors
      };
    }
  }

  // Create ticket data from service and ticket info
  createTicketData(ticket: any, serviceName: string): TicketData {
    return {
      ticket_number: ticket.ticket_number || ticket.number || ticket.id?.toString() || 'N/A',
      service_name: serviceName,
      created_at: ticket.created_at || new Date().toISOString(),
      printer_id: ticket.printer_id || undefined
    };
  }

  // Test ticket generation
  async testTicketGeneration(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await window.api.testTicketGeneration();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate ticket data
  async validateTicketData(ticketData: TicketData): Promise<{ success: boolean; valid: boolean; message: string }> {
    try {
      const result = await window.api.validateTicketData(ticketData);
      return result;
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Format date for ticket display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time for ticket display
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 🧠 SMART PRINT SYSTEM - النظام الذكي المتكامل
  async smartCreateAndPrint(ticketData: {
    ticket_number: string;
    service_name: string;
    service_id: number;
    printer_id?: string;
    print_source?: 'customer' | 'display' | 'background' | 'admin';
    company_name?: string;
    position?: number;
    window_number?: number;
  }): Promise<{
    success: boolean;
    message: string;
    ticketSaved?: boolean;
    pdfGenerated?: boolean;
    printed?: boolean;
    pdfPath?: string;
    printer?: string;
    location?: 'customer' | 'display';
    error?: string;
    warnings?: string[];
  }> {
    try {

      const smartTicketData = {
        ...ticketData,
        created_at: new Date().toISOString(),
        print_source: ticketData.print_source || 'customer'
      };

      const result = await window.api.smartCreateAndPrintTicket(smartTicketData);

      if (result.success) {
      } else {
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطأ في النظام الذكي',
        ticketSaved: false,
        pdfGenerated: false,
        printed: false,
        error: 'SMART_PRINT_ERROR'
      };
    }
  }

  // اختبار النظام الذكي
  async testSmartPrintSystem(): Promise<any> {
    try {
      const result = await window.api.testSmartPrintSystem();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطأ في اختبار النظام الذكي'
      };
    }
  }
}

// Export singleton instance
const printServices = new PrintServices();
export default printServices;
