// 🖨️ Print Handlers - معالجات الطباعة
import { ipcMain, app } from 'electron'
import { SumatraPDFManager } from '../utils/sumatraPDFManager'
import { TicketPDFGenerator } from '../printing/ticketPDFGenerator'
import { getLocalPrinters } from '../printerUtils'
import { getNetworkServerInfo } from './networkHandlers'

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
      const path = require('path');
      const fs = require('fs');

      // Determine if we're in development or production
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

      let logoPath;

      if (isDev) {
        // Development mode: search in project resources folder
        logoPath = path.join(__dirname, '../../resources/assets/logo.png');

        // Alternative development paths
        const altPaths = [
          path.join(__dirname, '../../resources/logo.png'),
          path.join(process.cwd(), 'resources/assets/logo.png'),
          path.join(process.cwd(), 'resources/logo.png')
        ];

        if (!fs.existsSync(logoPath)) {
          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              logoPath = altPath;
              break;
            }
          }
        }
      } else {
        // Production mode: logo should be in resources folder
        logoPath = path.join(process.resourcesPath, 'assets', 'logo.png');

        // Fallback for production
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(process.resourcesPath, 'logo.png');
        }
      }

      // Check if logo exists
      if (fs.existsSync(logoPath)) {
        console.log('[IPC] Logo found at:', logoPath);
        return `file://${logoPath.replace(/\\/g, '/')}`;
      } else {
        console.warn('[IPC] Logo not found at path:', logoPath);
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
      console.log(`[IPC] 📝 Original ticket data:`, {
        ticket_number: ticketData.ticket_number,
        service_name: ticketData.service_name,
        service_name_length: ticketData.service_name?.length || 0,
        company_name: ticketData.company_name,
        print_source: ticketData.print_source
      });

      // ✅ Environment diagnostics
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
      console.log(`[IPC] 🔍 Environment: ${isDev ? 'Development' : 'Production'}`);
      console.log(`[IPC] 📁 app.isPackaged: ${app.isPackaged}`);
      console.log(`[IPC] 📁 process.resourcesPath: ${process.resourcesPath || 'undefined'}`);

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

      // Generate PDF first with enhanced error handling
      console.log(`[IPC] 📄 Starting PDF generation...`);
      const generator = TicketPDFGenerator.getInstance();
      const pdfPath = await generator.generateFromTicketData(sanitizedTicketData);

      if (!pdfPath) {
        console.error(`[IPC] ❌ PDF generation failed for ticket ${sanitizedTicketData.ticket_number}`);
        throw new Error('Failed to generate PDF for ticket');
      }

      console.log(`[IPC] ✅ PDF generated successfully: ${pdfPath}`);

      // Enhanced PDF file verification
      const fs = require('fs');
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`[IPC] 📁 PDF file verified - Size: ${stats.size} bytes`);

        if (stats.size === 0) {
          console.error(`[IPC] ❌ PDF file is empty: ${pdfPath}`);
          throw new Error('Generated PDF file is empty');
        }
      } else {
        console.error(`[IPC] ❌ PDF file not found: ${pdfPath}`);
        throw new Error('PDF file was not created');
      }

      // Check SumatraPDF availability before printing
      const sumatraManager = SumatraPDFManager.getInstance();
      const diagnostics = sumatraManager.getDiagnostics();

      console.log(`[IPC] 🔍 SumatraPDF Diagnostics:`, diagnostics);

      if (!diagnostics.isAvailable) {
        console.error(`[IPC] ❌ SumatraPDF not available - Path: ${diagnostics.executablePath}`);
        console.error(`[IPC] 📁 Executable exists: ${diagnostics.executableExists}`);
        console.warn(`[IPC] ⚠️ SumatraPDF not available, printing may fail`);
      }

      // Print using SumatraPDF (silent printing)
      console.log(`[IPC] 🖨️ Starting print process...`);
      const result = await sumatraManager.printPDF(pdfPath, printerName);

      console.log(`[IPC] 🖨️ Print command executed:`, result);

      return {
        success: result.success,
        message: result.success ? 'Ticket printed successfully' : result.message,
        pdfPath: pdfPath,
        printer: printerName,
        printMethod: result.method,
        diagnostics: diagnostics
      };

    } catch (printError) {
      console.error(`[IPC] ❌ Print execution failed:`, printError);

      // Get additional diagnostics on error
      try {
        const sumatraManager = SumatraPDFManager.getInstance();
        const diagnostics = sumatraManager.getDiagnostics();
        console.error(`[IPC] 🔍 Error diagnostics:`, diagnostics);
      } catch (diagError) {
        console.error(`[IPC] ❌ Failed to get diagnostics:`, diagError);
      }

      // Even if printing fails, PDF is still generated
      return {
        success: false,
        message: `Print failed: ${printError instanceof Error ? printError.message : 'Unknown error'}`,
        printer: printerName,
        error: 'PRINT_FAILED',
        details: printError instanceof Error ? printError.stack : String(printError)
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

  // 🔍 Production diagnostics handler
  ipcMain.handle('get-production-diagnostics', async () => {
    try {
      const { runProductionDiagnostics } = require('../utils/productionDiagnostics');
      return {
        success: true,
        diagnostics: runProductionDiagnostics()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // 🔍 Environment info handler
  ipcMain.handle('get-environment-info', async () => {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    return {
      environment: isDev ? 'development' : 'production',
      isPackaged: app.isPackaged,
      nodeEnv: process.env.NODE_ENV,
      resourcesPath: process.resourcesPath,
      cwd: process.cwd(),
      appPath: app.getAppPath(),
      userData: app.getPath('userData')
    };
  });

  console.log('[HANDLERS] 🖨️ Print handlers registered successfully');
}
