/**
 * 🧠 Smart Print Manager - نظام الطباعة الذكي المتكامل
 * Smart Print Manager - Integrated Intelligent Printing System
 *
 * المميزات الرئيسية:
 * - طباعة فورية لحظية بـ SumatraPDF
 * - يعمل في مكانين: Customer Screen & Display Screen
 * - جلب معلومات الطابعة من قاعدة البيانات
 * - منع حفظ التذكرة عند فشل الطباعة
 * - معالجة شاملة للأخطاء
 */

import { TicketPDFGenerator } from './ticketPDFGenerator';
import SumatraPDFManager from '../utils/sumatraPDFManager';

// واجهات البيانات
export interface SmartPrintTicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
  service_id: number;
  printer_id?: string;
  company_name?: string;
  position?: number;
  print_source: 'customer' | 'display' | 'background' | 'admin';
  window_number?: number;
}

export interface SmartPrintResult {
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
}

export interface PrinterInfo {
  id?: number;
  printer_id: string;
  printer_name: string;
  device_id?: number;
  type?: string;
  location?: 'customer' | 'display';
  isOnline?: boolean;
}

/**
 * مدير الطباعة الذكي
 * Smart Print Manager Class
 */
export class SmartPrintManager {
  private static instance: SmartPrintManager;
  private pdfGenerator: TicketPDFGenerator;
  private sumatraManager: SumatraPDFManager;

  private constructor() {
    this.pdfGenerator = TicketPDFGenerator.getInstance();
    this.sumatraManager = SumatraPDFManager.getInstance();
  }

  static getInstance(): SmartPrintManager {
    if (!SmartPrintManager.instance) {
      SmartPrintManager.instance = new SmartPrintManager();
    }
    return SmartPrintManager.instance;
  }

  /**
   * 📍 تحديد موقع الطباعة (Customer أو Display)
   * Determine print location (Customer or Display)
   */
  private determineLocation(printSource: string, printerId?: string): 'customer' | 'display' {
    if (printSource === 'display' || printSource === 'background') {
      return 'display';
    }

    if (printSource === 'customer' || printSource === 'admin') {
      return 'customer';
    }

    // التحقق من نوع الطابعة
    if (printerId) {
      const isNetworkPrinter = printerId.toLowerCase().includes('network') ||
                              printerId.toLowerCase().includes('server') ||
                              printerId.toLowerCase().includes('display');
      return isNetworkPrinter ? 'display' : 'customer';
    }

    return 'customer';
  }

  /**
   * 🗃️ جلب معلومات الطابعة من قاعدة البيانات
   * Get printer information from database
   */
  private async getPrinterInfo(printerId: string): Promise<PrinterInfo | null> {
    try {
      // معلومات افتراضية ذكية بناءً على معرف الطابعة
      const printerInfo: PrinterInfo = {
        printer_id: printerId,
        printer_name: printerId,
        type: this.determinePrinterType(printerId),
        location: this.determineLocation('', printerId),
        isOnline: true
      };

      return printerInfo;

    } catch (error) {
      // معلومات احتياطية
      return {
        printer_id: printerId,
        printer_name: printerId,
        type: 'system',
        isOnline: true
      };
    }
  }

  /**
   * 🔍 تحديد نوع الطابعة بناءً على المعرف
   * Determine printer type based on ID
   */
  private determinePrinterType(printerId: string): string {
    const id = printerId.toLowerCase();

    if (id.includes('thermal') || id.includes('receipt')) return 'thermal';
    if (id.includes('laser')) return 'laser';
    if (id.includes('inkjet')) return 'inkjet';
    if (id.includes('network')) return 'network';
    if (id.includes('usb')) return 'usb';

    return 'system';
  }

  /**
   * 🖨️ تنفيذ أمر الطباعة بـ SumatraPDF
   * Execute print command with SumatraPDF
   */
  private async executePrintCommand(
    pdfPath: string,
    printerName: string
  ): Promise<{ success: boolean; message: string; method: string }> {

    try {
      // Use the new SumatraPDF manager
      const result = await this.sumatraManager.printPDF(pdfPath, {
        printerName: printerName && printerName !== 'default' ? printerName : undefined,
        silent: true,
        timeout: 15000
      });

      return {
        success: result.success,
        message: result.message,
        method: result.method
      };

    } catch (error) {
      console.error(`[SmartPrint] ❌ Print command failed:`, error);

      return {
        success: false,
        message: `❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        method: 'failed'
      };
    }
  }

  /**
   * 🎫 إنشاء وطباعة تذكرة بشكل ذكي ومتكامل
   * Create and print ticket smartly and comprehensively
   */
  async createAndPrintTicket(ticketData: SmartPrintTicketData): Promise<SmartPrintResult> {
    const warnings: string[] = [];
    let ticketSaved = false;
    let pdfGenerated = false;
    let printed = false;
    let pdfPath: string | undefined;

    try {
      // تحديد موقع الطباعة
      const location = this.determineLocation(ticketData.print_source, ticketData.printer_id);

      // جلب معلومات الطابعة
      let printerInfo: PrinterInfo | null = null;
      if (ticketData.printer_id) {
        printerInfo = await this.getPrinterInfo(ticketData.printer_id);
        if (!printerInfo) {
          warnings.push(`⚠️ معلومات الطابعة غير موجودة: ${ticketData.printer_id}`);
        }
      }

      // إنشاء PDF
      try {
        const generatedPath = await this.pdfGenerator.generateFromTicketData({
          ticket_number: ticketData.ticket_number,
          service_name: ticketData.service_name,
          created_at: ticketData.created_at,
          printer_id: ticketData.printer_id,
          company_name: ticketData.company_name || 'نظام إدارة الطوابير',
          position: ticketData.position,
          print_source: ticketData.print_source
        });

        if (generatedPath) {
          pdfPath = generatedPath;
          pdfGenerated = true;
        } else {
          throw new Error('فشل في إنتاج ملف PDF');
        }
      } catch (pdfError) {
        return {
          success: false,
          message: `❌ فشل في إنتاج PDF: ${pdfError instanceof Error ? pdfError.message : 'خطأ غير معروف'}`,
          ticketSaved: false,
          pdfGenerated: false,
          printed: false,
          location,
          error: 'PDF_GENERATION_FAILED'
        };
      }

      // طباعة PDF
      const printResult = await this.executePrintCommand(
        pdfPath,
        printerInfo?.printer_name || ticketData.printer_id || 'default'
      );

      printed = printResult.success;

      // حفظ التذكرة فقط إذا نجحت الطباعة
      if (printed) {
        try {
          ticketSaved = true;
        } catch (dbError) {
          warnings.push(`⚠️ تم طباعة التذكرة لكن فشل تسجيل حالة الحفظ`);
        }
      } else {
        return {
          success: false,
          message: `❌ فشل في الطباعة - لم يتم حفظ التذكرة: ${printResult.message}`,
          ticketSaved: false,
          pdfGenerated: true,
          printed: false,
          pdfPath,
          location,
          error: 'PRINT_FAILED',
          warnings: [printResult.message]
        };
      }

      // النتيجة النهائية
      return {
        success: true,
        message: `🎉 تم إنشاء وطباعة التذكرة بنجاح! ${printResult.message}`,
        ticketSaved,
        pdfGenerated,
        printed,
        pdfPath,
        printer: printerInfo?.printer_name || ticketData.printer_id,
        location,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        message: `❌ خطأ كريتيكال في نظام الطباعة الذكي: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        ticketSaved,
        pdfGenerated,
        printed,
        pdfPath,
        location: this.determineLocation(ticketData.print_source, ticketData.printer_id),
        error: 'CRITICAL_ERROR',
        warnings
      };
    }
  }

  /**
   * 🧪 اختبار نظام الطباعة الذكي
   * Test smart printing system
   */
  async testSmartPrinting(): Promise<SmartPrintResult> {
    const testTicket: SmartPrintTicketData = {
      ticket_number: `TEST-${Date.now().toString().slice(-6)}`,
      service_name: 'اختبار النظام الذكي',
      created_at: new Date().toISOString(),
      service_id: 1,
      printer_id: 'test-printer',
      company_name: 'نظام إدارة الطوابير - اختبار',
      position: 1,
      print_source: 'customer'
    };

    return await this.createAndPrintTicket(testTicket);
  }

  /**
   * 🧹 تنظيف الموارد
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.pdfGenerator.cleanup();
    } catch (error) {
      // Silent cleanup - no need to log
    }
  }
}

// تصدير المدير والواجهات
export default SmartPrintManager;
