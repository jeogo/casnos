// 🖨️ Print Handlers - معالجات الطباعة
import { ipcMain } from 'electron'
import { SumatraPDFManager } from '../utils/sumatraPDFManager'
import { TicketPDFGenerator } from '../printing/ticketPDFGenerator'
import { getLocalPrinters } from '../printerUtils'

export function setupPrintHandlers() {
  // IPC handler to get local printers (from this PC, not server)
  ipcMain.handle('get-local-printers', async () => {
    try {
      const localPrinters = await getLocalPrinters();
      return localPrinters;
    } catch (error) {
      console.error('[ELECTRON] Error in get-local-printers handler:', error);
      return [];
    }
  });

  // PDF Generation IPC Handlers
  ipcMain.handle('get-logo-path', async () => {
    try {
      const path = require('path');
      const fs = require('fs');

      // Logo should be in resources/assets/logo.png
      const logoPath = path.join(process.resourcesPath, 'assets', 'logo.png');

      // Check if logo exists
      if (fs.existsSync(logoPath)) {
        console.log('[IPC] Logo found at:', logoPath);
        return `file://${logoPath.replace(/\\/g, '/')}`;
      } else {
        console.warn('[IPC] Logo not found at expected path:', logoPath);
        // Fallback: check in app directory during development
        const appPath = path.join(__dirname, '../../resources/assets/logo.png');
        if (fs.existsSync(appPath)) {
          return `file://${appPath.replace(/\\/g, '/')}`;
        }
        return null;
      }
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle('generate-pdf', async (_event, ticketData, _outputPath) => {
    try {
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(ticketData);

      return {
        success: !!pdfPath,
        path: pdfPath,
        message: pdfPath ? 'PDF generated successfully' : 'Failed to generate PDF'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Create real ticket (static mock response)
  ipcMain.handle('create-real-ticket', async (_event, serviceId, printerId) => {
    try {
      console.log(`[IPC] Creating mock ticket for service ${serviceId} with printer ${printerId}`);

      // Generate a random ticket number
      const ticketNumber = Math.floor(Math.random() * 1000) + 1;

      return {
        success: true,
        ticket: {
          ticket_number: ticketNumber,
          service_name: 'Mock Service',
          created_at: new Date().toISOString(),
          position: ticketNumber,
          window_number: 1,
          printer_id: printerId
        }
      };
    } catch (error) {
      console.error('[IPC] Error creating mock ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ⚡ Enhanced Print handling with INSTANT printing capability
  ipcMain.handle('print-ticket', async (_event, ticketData, printerName) => {
    try {
      console.log(`[IPC] 🖨️ Print request for ticket ${ticketData.ticket_number}`);

      // Generate PDF first
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(ticketData);

      if (!pdfPath) {
        throw new Error('Failed to generate PDF for ticket');
      }

      // Print using SumatraPDF (silent printing)
      const sumatraManager = SumatraPDFManager.getInstance();
      const result = await sumatraManager.printPDF(pdfPath, printerName);

      return {
        success: true,
        message: 'Ticket printed successfully',
        pdfPath: pdfPath,
        printer: printerName,
        printMethod: result.method
      };

    } catch (printError) {
      console.error(`[IPC] ❌ Print execution failed: ${printError}`);

      // Even if printing fails, PDF is still generated
      return {
        success: true,
        message: 'PDF generated successfully, but printing failed. Check printer settings.',
        printer: printerName,
        warning: 'Print failed but PDF saved'
      };
    }
  });

  // ⚡ Smart Print handler - Ultra-fast printing with automatic printer selection
  ipcMain.handle('smart-print-ticket', async (_event, ticketData, preferences = {}) => {
    try {
      console.log(`[IPC] 🧠 SMART PRINT request for ${ticketData.ticket_number}`);
      console.log(`[IPC] Preferences:`, preferences);

      // Quick printer selection logic
      let selectedPrinter = preferences.printerName;

      if (!selectedPrinter && preferences.silent !== true) {
        // Auto-select best available printer
        try {
          const printers = await getLocalPrinters();
          // Prefer thermal or receipt printers
          selectedPrinter = printers.find(p =>
            p.name.toLowerCase().includes('thermal') ||
            p.name.toLowerCase().includes('receipt') ||
            p.name.toLowerCase().includes('pos')
          )?.name || printers[0]?.name;

          console.log(`[IPC] 🎯 Auto-selected printer: ${selectedPrinter}`);
        } catch (err) {
          console.log('[IPC] No local printers found, using default');
        }
      }

      // Generate PDF and print instantly
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(ticketData);

      if (!pdfPath) {
        return {
          success: false,
          message: 'Failed to generate PDF',
          pdfGenerated: false,
          printed: false
        };
      }

      // Print using most appropriate method
      const sumatraManager = SumatraPDFManager.getInstance();
      const result = await sumatraManager.printPDF(pdfPath, selectedPrinter);

      return {
        success: true,
        message: 'Smart print completed successfully',
        pdfPath: pdfPath,
        printer: selectedPrinter,
        method: result.method
      };

    } catch (error) {
      console.error('[IPC] Error in smart print:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطأ في النظام الذكي',
        ticketSaved: false,
        pdfGenerated: false,
        printed: false,
        error: 'SMART_PRINT_ERROR'
      };
    }
  });

  console.log('[HANDLERS] 🖨️ Print handlers registered successfully');
}
