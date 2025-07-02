// 🖨️ Print Handlers - معالجات الطباعة
import { ipcMain } from 'electron'
import { getLocalPrinters } from '../printerUtils';
import { TicketPDFGenerator } from '../printing/ticketPDFGenerator';
import SmartPrintManager from '../printing/smartPrintManager';
import SumatraPDFManager from '../utils/sumatraPDFManager';
import axios from 'axios';

// المتغيرات المطلوبة للخادم
let discoveredServerIp: string | null = null;
let discoveredServerPort: number = 3001;

// دالة لتحديث معلومات الخادم من الخدمة الرئيسية
export function updateServerInfo(ip: string | null, port: number) {
  discoveredServerIp = ip;
  discoveredServerPort = port;
  console.log(`[PRINT_HANDLERS] Server info updated: ${ip}:${port}`);
}

// دالة للحصول على معلومات الخادم الحالية
export function getServerInfo() {
  return { ip: discoveredServerIp, port: discoveredServerPort };
}

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

  // Create real ticket through database API
  ipcMain.handle('create-real-ticket', async (_event, serviceId, printerId) => {
    try {
      console.log(`[IPC] Creating real ticket for service ${serviceId} with printer ${printerId}`);

      // Try to get server info from multiple sources in order of preference
      let serverIp = discoveredServerIp;
      let serverPort = discoveredServerPort;

      // 1. Try networkHandlers system first
      if (!serverIp) {
        const { getNetworkServerInfo } = require('./networkHandlers');
        const networkInfo = getNetworkServerInfo();
        if (networkInfo.ip) {
          serverIp = networkInfo.ip;
          serverPort = networkInfo.port;
          console.log(`[IPC] Using server info from network handlers: ${serverIp}:${serverPort}`);
        }
      }

      // 2. Try UDP discovery service
      if (!serverIp) {
        const { getDiscoveredServerInfo } = require('../services/udpDiscoveryService');
        const serverInfo = getDiscoveredServerInfo();
        if (serverInfo.ip) {
          serverIp = serverInfo.ip;
          serverPort = serverInfo.port;
          console.log(`[IPC] Using server info from UDP discovery: ${serverIp}:${serverPort}`);
        }
      }

      if (!serverIp) {
        throw new Error('Server not discovered yet - please ensure the server is running and try again');
      }

      const serverUrl = `http://${serverIp}:${serverPort}`;

      // Create ticket through API
      const ticketResponse = await axios.post(`${serverUrl}/api/tickets`, {
        service_id: serviceId,
        printer_id: printerId,
        source: 'customer'
      });

      if (ticketResponse.data && ticketResponse.data.success) {
        const ticketData = ticketResponse.data.data;

        // Get service name
        const servicesResponse = await axios.get(`${serverUrl}/api/services`);
        const servicesData = servicesResponse.data;
        const services = Array.isArray(servicesData) ? servicesData : (servicesData.data || []);
        const service = services.find((s: any) => s.id === serviceId);

        console.log(`[IPC] ✅ Real ticket created: ${ticketData.ticket_number}`);

        return {
          success: true,
          ticket: {
            ticket_number: ticketData.ticket_number,
            service_name: service ? service.name : 'Unknown Service',
            created_at: ticketData.created_at,
            position: ticketData.position || ticketData.id,
            window_number: ticketData.window_number || 1,
            printer_id: printerId
          }
        };
      } else {
        throw new Error('Failed to create ticket through API');
      }

    } catch (error) {
      console.error('[IPC] Error creating real ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ⚡ Enhanced Print handling with INSTANT printing capability
  ipcMain.handle('print-ticket', async (_event, ticketData, printerName) => {
    try {
      console.log(`[IPC] 🚀 INSTANT PRINT request for ${ticketData.ticket_number} to printer: ${printerName}`);
      console.log(`[IPC] Print source: ${ticketData.print_source || 'unknown'}`);

      // Step 1: Generate PDF quickly
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(ticketData);

      if (!pdfPath) {
        return {
          success: false,
          message: 'Failed to generate PDF for printing'
        };
      }

      // Execute print command with SumatraPDFManager
      try {
        const sumatraManager = SumatraPDFManager.getInstance();
        const result = await sumatraManager.printPDF(pdfPath, {
          printerName: printerName && printerName !== 'default' ? printerName : undefined,
          silent: true,
          timeout: 15000
        });

        return {
          success: result.success,
          message: result.message,
          pdfPath: pdfPath,
          printer: printerName || 'default',
          printMethod: result.method
        };

      } catch (printError) {
        console.error(`[IPC] ❌ Print execution failed: ${printError}`);

        // Even if printing fails, PDF is still generated
        return {
          success: true,
          message: 'PDF generated successfully, but printing failed. Check printer settings.',
          pdfPath: pdfPath,
          printer: printerName,
          warning: 'Print failed but PDF saved'
        };
      }

    } catch (error) {
      console.error('[IPC] Error in instant print:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown printing error'
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
          message: 'Failed to generate PDF for smart printing'
        };
      }

      // Smart print execution with SumatraPDFManager
      try {
        const sumatraManager = SumatraPDFManager.getInstance();
        const result = await sumatraManager.printPDF(pdfPath, {
          printerName: selectedPrinter && selectedPrinter !== 'default' ? selectedPrinter : undefined,
          silent: true,
          timeout: 15000
        });

        console.log(`[IPC] � SMART PRINT result: ${result.method} - ${result.message}`);

        return {
          success: result.success,
          message: `🧠 Smart print: ${result.message}`,
          pdfPath: pdfPath,
          printer: selectedPrinter || 'default',
          method: result.method
        };

      } catch (printError) {
        console.error(`[IPC] ❌ SMART PRINT failed: ${printError}`);

        return {
          success: true,
          message: 'PDF generated, manual print required',
          pdfPath: pdfPath,
          warning: 'Smart print failed but PDF ready',
          method: 'manual'
        };
      }

    } catch (error) {
      console.error('[IPC] Error in smart print:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Smart print error'
      };
    }
  });

  // 🧠 Smart Print System - النظام الذكي المتكامل للطباعة
  ipcMain.handle('smart-create-and-print-ticket', async (_event, ticketData) => {
    try {
      console.log(`[IPC] 🧠 Smart print request for service: ${ticketData.service_name}`);

      const smartPrintManager = SmartPrintManager.getInstance();
      const result = await smartPrintManager.createAndPrintTicket(ticketData);

      console.log(`[IPC] Smart print result:`, result);
      return result;

    } catch (error) {
      console.error('[IPC] Error in smart print system:', error);
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

  // 🧪 SumatraPDF Testing Handler
  ipcMain.handle('test-sumatra-pdf', async () => {
    try {
      console.log('[IPC] 🧪 Testing SumatraPDF functionality...');

      const sumatraManager = SumatraPDFManager.getInstance();
      const testResult = await sumatraManager.testPrint();
      const diagnostics = sumatraManager.getDiagnostics();

      console.log('[IPC] SumatraPDF test result:', testResult);
      console.log('[IPC] SumatraPDF diagnostics:', diagnostics);

      return {
        success: testResult.success,
        message: testResult.message,
        method: testResult.method,
        diagnostics: diagnostics,
        command: testResult.command,
        error: testResult.error
      };

    } catch (error) {
      console.error('[IPC] Error testing SumatraPDF:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown SumatraPDF test error',
        diagnostics: {
          executablePath: null,
          executableExists: false,
          settingsPath: null,
          settingsExists: false,
          isAvailable: false
        }
      };
    }
  });

  // 🔍 SumatraPDF Diagnostics Handler
  ipcMain.handle('get-sumatra-pdf-diagnostics', async () => {
    try {
      const sumatraManager = SumatraPDFManager.getInstance();
      const diagnostics = sumatraManager.getDiagnostics();

      console.log('[IPC] SumatraPDF diagnostics requested:', diagnostics);

      return {
        success: true,
        diagnostics: diagnostics
      };

    } catch (error) {
      console.error('[IPC] Error getting SumatraPDF diagnostics:', error);
      return {
        success: false,
        diagnostics: {
          executablePath: null,
          executableExists: false,
          settingsPath: null,
          settingsExists: false,
          isAvailable: false
        }
      };
    }
  });

  // 🧠 Test Smart Print System Handler
  ipcMain.handle('test-smart-print-system', async () => {
    try {
      console.log('[IPC] 🧠 Testing Smart Print System...');

      const smartPrintManager = SmartPrintManager.getInstance();
      const testResult = await smartPrintManager.testSmartPrinting();

      console.log('[IPC] Smart Print System test result:', testResult);

      return testResult;

    } catch (error) {
      console.error('[IPC] Error testing Smart Print System:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown Smart Print System test error',
        ticketSaved: false,
        pdfGenerated: false,
        printed: false,
        error: 'SMART_PRINT_TEST_ERROR'
      };
    }
  });

  console.log('[HANDLERS] 🖨️ Print handlers registered successfully');
}
