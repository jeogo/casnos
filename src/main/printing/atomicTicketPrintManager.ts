/**
 * مدير الطباعة الذري للتذاكر
 * Atomic Ticket Print Manager
 *
 * تطبيق منطق "لا طباعة، لا تذكرة" بشكل ذري
 * Implements "No Print, No Ticket" logic atomically
 */

import { TicketPDFGenerator } from './ticketPDFGenerator'
import SumatraPDFManager from '../utils/sumatraPDFManager'
import { ProductionMonitor } from '../utils/productionMonitor'
import { serviceOperations } from '../embedded-server/db/operations/services'
import { ticketOperations } from '../embedded-server/db/operations/tickets'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

// واجهات البيانات
export interface AtomicTicketData {
  service_id: number
  print_type: 'local' | 'network'
  printer_name: string
  print_source: 'customer' | 'display' | 'admin'
  company_name?: string
  logo_url?: string
}

export interface AtomicTicketResult {
  success: boolean
  ticket?: any
  message?: string
  error?: string
  pdfPath?: string
  printDuration?: number
}

export interface TempTicketData {
  ticket_number: string
  service_id: number
  service_name: string
  created_at: string
  print_source: 'customer' | 'display' | 'admin'
  company_name?: string
  logo_url?: string
}

/**
 * مدير الطباعة الذري للتذاكر
 * Atomic Ticket Print Manager
 */
export class AtomicTicketPrintManager {
  private static instance: AtomicTicketPrintManager
  private pdfGenerator: TicketPDFGenerator
  private sumatraPDF: SumatraPDFManager
  private monitor: ProductionMonitor
  private tempDir: string

  private constructor() {
    this.pdfGenerator = TicketPDFGenerator.getInstance()
    this.sumatraPDF = SumatraPDFManager.getInstance()
    this.monitor = ProductionMonitor.getInstance()
    this.tempDir = path.join(app.getPath('temp'), 'casnos-atomic-tickets')
    this.ensureTempDir()
  }

  static getInstance(): AtomicTicketPrintManager {
    if (!AtomicTicketPrintManager.instance) {
      AtomicTicketPrintManager.instance = new AtomicTicketPrintManager()
    }
    return AtomicTicketPrintManager.instance
  }

  /**
   * إنشاء مجلد الملفات المؤقتة
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true })
      }
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to create temp directory:', error)
    }
  }

  /**
   * إنشاء بيانات التذكرة المؤقتة
   * Generate temporary ticket data
   */
  private generateTempTicketData(serviceId: number): TempTicketData | null {
    try {
      // التحقق من وجود الخدمة
      const service = serviceOperations.getById(serviceId)
      if (!service) {
        return null
      }

      // إنشاء رقم تذكرة مؤقت
      const tempTicketNumber = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

      return {
        ticket_number: tempTicketNumber,
        service_id: serviceId,
        service_name: service.name,
        created_at: new Date().toISOString(),
        print_source: 'customer',
        company_name: '',
        logo_url: undefined
      }
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to generate temp ticket data:', error)
      return null
    }
  }

  /**
   * إنشاء PDF مؤقت
   * Generate temporary PDF
   */
  private async generateTempPDF(ticketData: TempTicketData): Promise<string | null> {
    try {
      // إنشاء مسار الملف المؤقت
      const tempFileName = `${ticketData.ticket_number}.pdf`
      const tempFilePath = path.join(this.tempDir, tempFileName)

      // إنشاء PDF
      const pdfPath = await this.pdfGenerator.generateFromTicketData({
        ticket_number: ticketData.ticket_number,
        service_name: ticketData.service_name,
        created_at: ticketData.created_at,
        print_source: ticketData.print_source,
        company_name: ticketData.company_name || '',
        logo_url: ticketData.logo_url
      })

      if (pdfPath && fs.existsSync(pdfPath)) {
        // نسخ الملف إلى المجلد المؤقت
        fs.copyFileSync(pdfPath, tempFilePath)
        return tempFilePath
      }

      return null
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to generate temp PDF:', error)
      return null
    }
  }

  /**
   * محاولة الطباعة
   * Attempt printing
   */
  private async attemptPrint(pdfPath: string, printerName: string): Promise<{ success: boolean; error?: string; duration?: number }> {
    const startTime = Date.now()

    try {
      // التحقق من وجود الملف
      if (!fs.existsSync(pdfPath)) {
        return { success: false, error: 'PDF file not found' }
      }

      // محاولة الطباعة
      const printResult = await this.sumatraPDF.printPDF(pdfPath, {
        printerName,
        silent: true,
        timeout: 5000
      })
      const duration = Date.now() - startTime

      if (printResult.success) {
        return { success: true, duration }
      } else {
        return { success: false, error: printResult.error || 'Print failed', duration }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown print error',
        duration
      }
    }
  }

  /**
   * حفظ التذكرة في قاعدة البيانات
   * Save ticket to database
   */
  private saveTicketToDatabase(
    serviceId: number,
    printType: 'local' | 'network'
  ): any {
    try {
      // إنشاء التذكرة بحالة مطبوعة
      const ticket = ticketOperations.create({
        service_id: serviceId,
        status: 'pending',
        print_status: 'printed'  // مطبوعة مسبقاً
      })

      // تسجيل النشاط
      this.monitor.recordPDFGenerationSuccess(ticket.ticket_number, '')
      this.monitor.recordPrintSuccess(ticket.ticket_number, printType)

      return ticket
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to save ticket to database:', error)
      throw error
    }
  }

  /**
   * تنظيف الملف المؤقت
   * Cleanup temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`[AtomicTicketPrint] Cleaned up temp file: ${filePath}`)
      }
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to cleanup temp file:', error)
    }
  }

  /**
   * 🎯 الوظيفة الرئيسية: إنشاء تذكرة مع طباعة ذرية
   * Main function: Create ticket with atomic printing
   */
  async createTicketWithAtomicPrint(atomicData: AtomicTicketData): Promise<AtomicTicketResult> {
    const startTime = Date.now()
    let tempFilePath: string | null = null

    try {
      // 1. إنشاء بيانات التذكرة المؤقتة
      const tempTicketData = this.generateTempTicketData(atomicData.service_id)
      if (!tempTicketData) {
        return {
          success: false,
          error: 'Failed to generate temp ticket data - service not found'
        }
      }

      // 2. إنشاء PDF مؤقت
      tempFilePath = await this.generateTempPDF(tempTicketData)
      if (!tempFilePath) {
        return {
          success: false,
          error: 'Failed to generate temporary PDF'
        }
      }

      // 3. محاولة الطباعة
      const printResult = await this.attemptPrint(tempFilePath, atomicData.printer_name)

      if (printResult.success) {
        // 4. إنشاء التذكرة في قاعدة البيانات عند نجاح الطباعة
        const ticket = this.saveTicketToDatabase(
          atomicData.service_id,
          atomicData.print_type
        )

        // 5. تنظيف الملف المؤقت
        this.cleanupTempFile(tempFilePath)

        const totalDuration = Date.now() - startTime

        return {
          success: true,
          ticket,
          message: `✅ تم إنشاء وطباعة التذكرة بنجاح - رقم التذكرة: ${ticket.ticket_number}`,
          printDuration: totalDuration
        }
      } else {
        // 6. تنظيف الملف المؤقت عند فشل الطباعة
        this.cleanupTempFile(tempFilePath)

        // تسجيل فشل الطباعة
        this.monitor.recordPrintFailure(
          tempTicketData.ticket_number,
          printResult.error || 'Unknown print error'
        )

        return {
          success: false,
          error: `❌ فشل في الطباعة - لم يتم إنشاء التذكرة: ${printResult.error}`,
          printDuration: printResult.duration
        }
      }
    } catch (error) {
      // تنظيف الملف المؤقت في حالة الخطأ
      if (tempFilePath) {
        this.cleanupTempFile(tempFilePath)
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: `❌ خطأ في النظام الذري: ${errorMessage}`,
        printDuration: Date.now() - startTime
      }
    }
  }

  /**
   * إنشاء تذكرة للطباعة الشبكية (DisplayScreen)
   * Create ticket for network printing (DisplayScreen)
   */
  async createNetworkTicketWithAtomicPrint(
    serviceId: number,
    printerName: string
  ): Promise<AtomicTicketResult> {
    return this.createTicketWithAtomicPrint({
      service_id: serviceId,
      print_type: 'network',
      printer_name: printerName,
      print_source: 'display'
    })
  }

  /**
   * إنشاء تذكرة للطباعة المحلية (CustomerScreen)
   * Create ticket for local printing (CustomerScreen)
   */
  async createLocalTicketWithAtomicPrint(
    serviceId: number,
    printerName: string
  ): Promise<AtomicTicketResult> {
    return this.createTicketWithAtomicPrint({
      service_id: serviceId,
      print_type: 'local',
      printer_name: printerName,
      print_source: 'customer'
    })
  }

  /**
   * تنظيف شامل للملفات المؤقتة
   * Comprehensive cleanup of temporary files
   */
  async cleanupAllTempFiles(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir)
        for (const file of files) {
          const filePath = path.join(this.tempDir, file)
          try {
            fs.unlinkSync(filePath)
          } catch (error) {
            console.error(`[AtomicTicketPrint] Failed to cleanup file ${file}:`, error)
          }
        }
        console.log(`[AtomicTicketPrint] Cleaned up ${files.length} temporary files`)
      }
    } catch (error) {
      console.error('[AtomicTicketPrint] Failed to cleanup temp directory:', error)
    }
  }

  /**
   * إحصائيات الطباعة الذرية
   * Atomic printing statistics
   */
  getAtomicPrintStats(): any {
    return {
      tempDir: this.tempDir,
      tempDirExists: fs.existsSync(this.tempDir),
      tempFileCount: fs.existsSync(this.tempDir) ? fs.readdirSync(this.tempDir).length : 0,
      timestamp: new Date().toISOString()
    }
  }
}

export default AtomicTicketPrintManager
