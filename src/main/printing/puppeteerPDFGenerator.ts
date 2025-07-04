import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import generateThermalTicketHTML from './ticketTemplate';
import PDFStorageManager from '../utils/pdfStorage';

// Ticket data interface
export interface TicketData {
  ticket_number: string;
  service_name: string;
  created_at: string;
  printer_id?: string;
  company_name?: string;
  logo_url?: string;
  position?: number;
  print_source?: 'customer' | 'display' | 'background' | 'admin'; // Track print source
}

/**
 * منشئ PDF عالي الجودة باستخدام Puppeteer
 * High-quality PDF generator using Puppeteer
 */
export class PuppeteerPDFGenerator {
  private static instance: PuppeteerPDFGenerator;
  private browser: any = null;

  private constructor() {}

  static getInstance(): PuppeteerPDFGenerator {
    if (!PuppeteerPDFGenerator.instance) {
      PuppeteerPDFGenerator.instance = new PuppeteerPDFGenerator();
    }
    return PuppeteerPDFGenerator.instance;
  }

  /**
   * تهيئة المتصفح
   * Initialize browser
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      try {
        console.log('[Puppeteer] Launching browser...');
        this.browser = await puppeteer.launch({
          headless: true,
          timeout: 60000, // 60 seconds timeout
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            // Optimize for faster B&W rendering
            '--force-color-profile=srgb',
            '--disable-color-correct-rendering',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--run-all-compositor-stages-before-draw'
          ]
        });
        console.log('[Puppeteer] ✅ Browser launched successfully');
      } catch (error) {
        console.error('[Puppeteer] ❌ Failed to launch browser:', error);
        this.browser = null;
        throw error;
      }
    }
  }

  /**
   * إنتاج PDF للتذكرة
   * Generate PDF for ticket
   */
  async generateTicketPDF(ticketData: TicketData, outputPath?: string): Promise<string | null> {
    try {
      await this.initBrowser();
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      const page = await this.browser.newPage();

      // Optimize page for faster B&W rendering
      await page.emulateMediaType('print');
      await page.setViewport({
        width: 302,
        height: 794,
        deviceScaleFactor: 1 // Optimized for faster rendering
      });

      const html = generateThermalTicketHTML(ticketData);
      const storageManager = PDFStorageManager.getInstance();

      // Faster content loading - no wait for network resources
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Faster than 'load'
        timeout: 10000 // Reduced timeout for speed
      });

      // Optimized viewport - removed duplicate
      // await page.setViewport({
      //   width: 302,
      //   height: 794,
      //   deviceScaleFactor: 1 // Reduced for better performance
      // });

      // Optimized font loading with timeout for faster generation
      try {
        await Promise.race([
          page.evaluateHandle('document.fonts.ready'),
          new Promise(resolve => setTimeout(resolve, 1000)) // Max 1 second wait
        ]);
      } catch (e) {
        // Continue without fonts if they fail to load quickly
        console.warn('[Puppeteer] Font loading timeout - proceeding with default fonts');
      }

      // Determine output path
      const finalPath = outputPath || storageManager.getTicketPath(
        ticketData.ticket_number,
        ticketData.service_name,
        ticketData.printer_id
      );

      // Ensure directory exists
      const directory = path.dirname(finalPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Generate PDF with optimized settings for ultra-light B&W rendering
      await page.pdf({
        path: finalPath,
        width: '80mm',
        height: '210mm',
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        printBackground: true,
        preferCSSPageSize: true,
        // Optimize for black and white, fast rendering
        format: undefined, // Let CSS control size
        displayHeaderFooter: false,
        headerTemplate: '',
        footerTemplate: '',
        omitBackground: false // Keep background for proper rendering
      });

      await page.close();

      // Quick file check
      if (fs.existsSync(finalPath)) {
        console.log(`[Puppeteer] ✅ PDF generated: ${finalPath}`);
        return finalPath;
      } else {
        throw new Error('PDF file was not created');
      }

    } catch (error) {
      console.error('[Puppeteer] Error generating PDF:', error);
      return null;
    }
  }

  /**
   * إغلاق المتصفح
   * Close browser
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      console.log('[Puppeteer] Closing browser...');
      await this.browser.close();
      this.browser = null;
      console.log('[Puppeteer] ✅ Browser closed');
    }
  }


}

export default PuppeteerPDFGenerator;
