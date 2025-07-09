import { PuppeteerPDFGenerator, TicketData } from './puppeteerPDFGenerator';

/**
 * تطبيق منشئ PDF للتذاكر - الإصدار النهائي المتفق عليه
 * Final Ticket PDF Generator - Production Ready
 *
 * This is the main entry point for generating ticket PDFs in production.
 * Uses Puppeteer with the professional ticket template.
 */
export class TicketPDFGenerator {
  private static instance: TicketPDFGenerator;
  private pdfGenerator: PuppeteerPDFGenerator;

  private constructor() {
    this.pdfGenerator = PuppeteerPDFGenerator.getInstance();
  }

  static getInstance(): TicketPDFGenerator {
    if (!TicketPDFGenerator.instance) {
      TicketPDFGenerator.instance = new TicketPDFGenerator();
    }
    return TicketPDFGenerator.instance;
  }  /**
   * إنتاج PDF للتذكرة من بيانات قاعدة البيانات
   * Generate ticket PDF from database data
   */
  async generateTicketFromData(
    ticketNumber: string,
    serviceName: string,
    createdAt: string,
    printerId?: string,
    companyName?: string,
    logoUrl?: string,
    position?: number,
    printSource?: 'customer' | 'display' | 'background' | 'admin'
  ): Promise<string | null> {
    try {
      const ticketData: TicketData = {
        ticket_number: ticketNumber,
        service_name: serviceName,
        created_at: createdAt,
        printer_id: printerId,
        company_name: companyName,
        logo_url: logoUrl,
        position: position,
        print_source: printSource
      };

      return await this.pdfGenerator.generateTicketPDF(ticketData);
    } catch (error) {
      console.error('[TicketPDF] Error generating ticket PDF:', error);
      return null;
    }
  }
  /**
   * إنتاج PDF للتذكرة من كائن البيانات الكامل
   * Generate ticket PDF from complete data object
   */
  async generateFromTicketData(ticketData: TicketData): Promise<string | null> {
    try {
      const pdfPath = await this.pdfGenerator.generateTicketPDF(ticketData);

      if (pdfPath) {
        console.log(`[TicketPDF] ✅ PDF generated: ${pdfPath}`);
        return pdfPath;
      } else {
        console.error(`[TicketPDF] ❌ Failed to generate PDF for ticket ${ticketData.ticket_number}`);
        return null;
      }
    } catch (error) {
      console.error('[TicketPDF] Error generating ticket PDF:', error);
      return null;
    }
  }

  /**
   * إنتاج PDF وإرجاع المسار للطباعة المباشرة
   * Generate PDF and return path for direct printing (e.g., sumartpdf.exe)
   */
  async generateForPrinting(
    ticketNumber: string,
    serviceName: string,
    createdAt: string,
    printerId?: string,
    companyName?: string,
    logoUrl?: string,
    position?: number,
    printSource?: 'customer' | 'display' | 'background' | 'admin'
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      console.log(`[TicketPDF] Preparing PDF for printing: ${ticketNumber} from source: ${printSource || 'unknown'}`);

      const pdfPath = await this.generateTicketFromData(
        ticketNumber,
        serviceName,
        createdAt,
        printerId,
        companyName,
        logoUrl,
        position,
        printSource
      );

      if (pdfPath) {
        return {
          success: true,
          pdfPath: pdfPath
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate PDF'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تنظيف الموارد
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.pdfGenerator.cleanup();
  }
}

// Export convenience functions for easy integration
export async function generateTicketPDF(
  ticketNumber: string,
  serviceName: string,
  createdAt: string,
  printerId?: string,
  companyName?: string,
  logoUrl?: string,
  position?: number,
  printSource?: 'customer' | 'display' | 'background' | 'admin'
): Promise<string | null> {
  const generator = TicketPDFGenerator.getInstance();
  return generator.generateTicketFromData(
    ticketNumber,
    serviceName,
    createdAt,
    printerId,
    companyName,
    logoUrl,
    position,
    printSource
  );
}

export async function generateTicketForPrinting(
  ticketNumber: string,
  serviceName: string,
  createdAt: string,
  printerId?: string,
  companyName?: string,
  logoUrl?: string,
  position?: number,
  printSource?: 'customer' | 'display' | 'background' | 'admin'
): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
  const generator = TicketPDFGenerator.getInstance();
  return generator.generateForPrinting(
    ticketNumber,
    serviceName,
    createdAt,
    printerId,
    companyName,
    logoUrl,
    position,
    printSource
  );
}

export default TicketPDFGenerator;
