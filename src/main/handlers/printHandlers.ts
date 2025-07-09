// 🖨️ Print Handlers - معالجات الطباعة
import { ipcMain } from 'electron'
import { SumatraPDFManager } from '../utils/sumatraPDFManager'
import { TicketPDFGenerator } from '../printing/ticketPDFGenerator'
import { getLocalPrinters } from '../printerUtils'
import { getNetworkServerInfo } from './networkHandlers'
import { ResourcePathManager } from '../utils/resourcePathManager'

export function setupPrintHandlers() {
  // IPC handler to get local printers (from this PC, not server)
  ipcMain.handle('get-local-printers', async () => {
    try {
      const localPrinters = await getLocalPrinters();
      return localPrinters;
    } catch (error) {
      // Silent error handling
      return [];
    }
  });

  // PDF Generation IPC Handlers
  ipcMain.handle('get-logo-path', async () => {
    try {
      const resourceManager = ResourcePathManager.getInstance();
      const logoPath = resourceManager.getLogoPath();

      if (logoPath) {
        console.log('[IPC] Logo found at:', logoPath);
        return `file://${logoPath.replace(/\\/g, '/')}`;
      } else {
        console.warn('[IPC] Logo not found');
        return null;
      }
    } catch (error) {
      console.error('[IPC] Error getting logo path:', error);
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
      console.log(`[IPC] 📝 Original ticket data:`, {
        ticket_number: ticketData.ticket_number,
        service_name: ticketData.service_name,
        service_name_length: ticketData.service_name?.length || 0,
        company_name: ticketData.company_name,
        print_source: ticketData.print_source
      });

      // ✅ Ensure company_name is always empty string as requested
      const sanitizedTicketData = {
        ...ticketData,
        company_name: ""
      };

      console.log(`[IPC] 📝 Sanitized ticket data - company_name set to empty string`);
      console.log(`[IPC] 🔍 Final data for PDF generation:`, {
        ticket_number: sanitizedTicketData.ticket_number,
        service_name: sanitizedTicketData.service_name,
        service_name_length: sanitizedTicketData.service_name?.length || 0,
        company_name: sanitizedTicketData.company_name,
        print_source: sanitizedTicketData.print_source
      });

      // Generate PDF first
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(sanitizedTicketData);

      if (!pdfPath) {
        throw new Error('Failed to generate PDF for ticket');
      }

      console.log(`[IPC] ✅ PDF generated successfully: ${pdfPath}`);

      // Print using SumatraPDF (silent printing)
      const sumatraManager = SumatraPDFManager.getInstance();
      const result = await sumatraManager.printPDF(pdfPath, printerName);

      console.log(`[IPC] 🖨️ Print command executed:`, result);

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

      // ✅ Ensure company_name is always empty string as requested
      const sanitizedTicketData = {
        ...ticketData,
        company_name: ""
      };

      console.log(`[IPC] 📝 Sanitized ticket data - company_name set to empty string`);

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
      const pdfPath = await generator.generateFromTicketData(sanitizedTicketData);

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

  // 🆕 معالج تسجيل الطابعات المحلية في قاعدة البيانات تلقائياً (محسن)
  ipcMain.handle('register-local-printers-to-database', async (_event, deviceId: string) => {
    try {
      console.log(`[IPC] 🖨️ Auto-registering local printers for device: ${deviceId}`);

      // التحقق من تسجيل الطابعات مسبقاً (منع التكرار)
      const registrationKey = `printers_registered_${deviceId}`;
      if (!global.printerRegistrationCache) {
        global.printerRegistrationCache = {};
      }

      const lastRegistration = global.printerRegistrationCache[registrationKey];
      if (lastRegistration && (Date.now() - lastRegistration < 300000)) { // 5 دقائق
        console.log('[IPC] ⏭️ Printers already registered recently, skipping...');
        return {
          success: true,
          message: 'Printers already registered recently',
          registered: 0,
          cached: true
        };
      }

      // جلب الطابعات المحلية
      const localPrinters = await getLocalPrinters();

      if (!localPrinters || localPrinters.length === 0) {
        console.log('[IPC] ⚠️ No local printers found');
        return {
          success: true,
          message: 'No local printers found to register',
          registered: 0
        };
      }

      console.log(`[IPC] 📋 Found ${localPrinters.length} local printers to register`);

      // جلب معلومات الخادم
      const serverInfo = getNetworkServerInfo();

      if (!serverInfo || !serverInfo.ip) {
        console.log('[IPC] ⚠️ No server connection available. Cannot register printers.');
        return {
          success: false,
          message: 'No server connection available for printer registration',
          registered: 0
        };
      }

      console.log(`[IPC] 🌐 Using server: ${serverInfo.ip}:${serverInfo.port}`);

      // تحضير axios
      const axios = require('axios');

      // جلب الطابعات المسجلة مسبقاً لهذا الجهاز
      let existingPrinters: any[] = [];
      try {
        const existingResponse = await axios.get(
          `http://${serverInfo.ip}:${serverInfo.port}/api/devices/${deviceId}/printers`,
          { timeout: 5000 }
        );
        if (existingResponse.data.success) {
          existingPrinters = existingResponse.data.data;
          console.log(`[IPC] 📋 Found ${existingPrinters.length} existing printers for device`);
        }
      } catch (err) {
        console.log('[IPC] ⚠️ Could not fetch existing printers, will try to register all');
      }

      // تسجيل كل طابعة في قاعدة البيانات
      let registeredCount = 0;
      const errors: string[] = [];

      for (const [index, printer] of localPrinters.entries()) {
        try {
          // إنشاء معرف فريد بناءً على اسم الطابعة الفعلي فقط (تجنب التكرار)
          const sanitizedName = printer.name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_');
          const printerId = `${deviceId}_${sanitizedName}`;

          // فحص إذا كانت الطابعة مسجلة مسبقاً
          const alreadyExists = existingPrinters.some((p: any) =>
            p.printer_name === printer.name || p.printer_id === printerId
          );

          if (alreadyExists) {
            console.log(`[IPC] ⏭️ Printer already exists: ${printer.name}`);
            registeredCount++;
            continue;
          }

          const printerData = {
            printer_id: printerId,
            printer_name: printer.name,
            is_default: index === 0, // أول طابعة تكون افتراضية
            // إضافة معلومات إضافية عن الطابعة
            printer_type: printer.type || 'local',
            driver_name: printer.driver || 'unknown',
            port_name: printer.port || 'unknown',
            connection_type: printer.connection_type || 'local'
          };

          const response = await axios.post(
            `http://${serverInfo.ip}:${serverInfo.port}/api/devices/${deviceId}/printers`,
            printerData,
            {
              timeout: 8000,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.data.success) {
            registeredCount++;
            console.log(`[IPC] ✅ Printer registered: ${printer.name} (${printerData.printer_id})`);
          } else {
            console.warn(`[IPC] ⚠️ Failed to register printer ${printer.name}:`, response.data.message);
            errors.push(`${printer.name}: ${response.data.message}`);
          }

        } catch (printerError: any) {
          // تجاهل الأخطاء للطابعات المسجلة مسبقاً
          if (printerError.response?.status === 409) {
            console.log(`[IPC] ℹ️ Printer already registered: ${printer.name}`);
            registeredCount++;
          } else {
            const errorMsg = printerError.response?.data?.message || printerError.message || 'Unknown error';
            console.warn(`[IPC] ⚠️ Error registering printer ${printer.name}:`, errorMsg);
            errors.push(`${printer.name}: ${errorMsg}`);
          }
        }
      }

      // تسجيل نجاح العملية في الذاكرة المؤقتة
      global.printerRegistrationCache[registrationKey] = Date.now();

      const message = registeredCount > 0
        ? `Successfully registered ${registeredCount}/${localPrinters.length} printers`
        : 'No new printers were registered (may already exist)';

      console.log(`[IPC] 🎉 Printer registration completed: ${registeredCount}/${localPrinters.length}`);

      return {
        success: true,
        message,
        registered: registeredCount,
        total: localPrinters.length,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('[IPC] ❌ Error in auto-register printers handler:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error in printer registration',
        registered: 0
      };
    }
  });

  // 🆕 جلب الطابعات المسجلة لجهاز معين من قاعدة البيانات
  ipcMain.handle('get-device-registered-printers', async (_event, deviceId: string) => {
    try {
      console.log(`[IPC] 📋 Getting registered printers for device: ${deviceId}`);

      // جلب معلومات الخادم
      const serverInfo = getNetworkServerInfo();

      if (!serverInfo || !serverInfo.ip) {
        console.log('[IPC] ⚠️ No server connection available. Cannot get registered printers.');
        return {
          success: false,
          message: 'No server connection available',
          printers: []
        };
      }

      const axios = require('axios');
      const response = await axios.get(
        `http://${serverInfo.ip}:${serverInfo.port}/api/devices/${deviceId}/printers`,
        { timeout: 5000 }
      );

      if (response.data.success) {
        console.log(`[IPC] ✅ Found ${response.data.data.length} registered printers for device`);
        return {
          success: true,
          printers: response.data.data,
          message: 'Device printers retrieved successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to get device printers',
          printers: []
        };
      }

    } catch (error) {
      console.error('[IPC] ❌ Error getting device printers:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        printers: []
      };
    }
  });

  // 🆕 جلب جميع الطابعات المسجلة في قاعدة البيانات (بدون تحديد device)
  ipcMain.handle('get-all-registered-printers', async () => {
    try {
      console.log(`[IPC] 📋 Getting all registered printers from database`);

      // جلب معلومات الخادم
      const serverInfo = getNetworkServerInfo();

      if (!serverInfo || !serverInfo.ip) {
        console.log('[IPC] ⚠️ No server connection available. Cannot get registered printers.');
        return {
          success: false,
          message: 'No server connection available',
          printers: []
        };
      }

      const axios = require('axios');
      const response = await axios.get(
        `http://${serverInfo.ip}:${serverInfo.port}/api/devices/printers/all`,
        { timeout: 5000 }
      );

      if (response.data.success) {
        console.log(`[IPC] ✅ Found ${response.data.data.length} total registered printers`);
        return {
          success: true,
          printers: response.data.data,
          message: 'All registered printers retrieved successfully'
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to get registered printers',
          printers: []
        };
      }

    } catch (error) {
      console.error('[IPC] ❌ Error getting all registered printers:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        printers: []
      };
    }
  });

  console.log('[HANDLERS] 🖨️ Print handlers registered successfully');
}
