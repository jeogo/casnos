import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import generateThermalTicketHTML from './ticketTemplate';
import PDFStorageManager from '../utils/pdfStorage';
import { pdfLogger } from '../utils/productionPDFLogger';
import ProductionMonitor from '../utils/productionMonitor';

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
   * الحصول على مسار Chromium الصحيح للإنتاج
   * Get correct Chromium path for production
   */
  private getChromiumExecutablePath(): string | undefined {
    try {
      pdfLogger.log('INFO', 'CHROMIUM', 'Starting Chromium path resolution', { stage: 'INIT' });

      const { app } = require('electron');
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

      if (isDev) {
        // Development: استخدم Puppeteer الافتراضي
        const defaultPath = puppeteer.executablePath();
        pdfLogger.logChromiumPath(defaultPath);
        return defaultPath;
      }

      // Production: البحث عن Chromium في مسارات متعددة
      const possiblePaths: string[] = [];

      // 1. مسار Puppeteer الافتراضي (إذا كان متوفراً)
      try {
        const defaultPath = puppeteer.executablePath();
        if (defaultPath) {
          possiblePaths.push(defaultPath);
        }
      } catch (e) {
        pdfLogger.log('WARN', 'CHROMIUM', 'Default Puppeteer path failed', { error: String(e) });
      }

      // 2. مسارات Chromium في مجلد التطبيق - محدث للإنتاج
      if (process.resourcesPath) {
        possiblePaths.push(
          // الأولوية للمسارات الأكثر شيوعاً
          path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'puppeteer', '.local-chromium', '*', 'chrome-win', 'chrome.exe'),
          path.join(process.resourcesPath, '..', 'chromium', 'chrome.exe'),
          path.join(process.resourcesPath, 'chromium', 'chrome.exe'),
          path.join(process.resourcesPath, 'chromium', 'win64-*', 'chrome-win', 'chrome.exe')
        );
      }

      // 3. مسارات أخرى محتملة - محدث
      possiblePaths.push(
        path.join(process.cwd(), 'node_modules', 'puppeteer', '.local-chromium', '*', 'chrome-win', 'chrome.exe'),
        path.join(path.dirname(process.execPath), 'chromium', 'chrome.exe'),
        path.join(path.dirname(process.execPath), 'resources', 'chromium', 'chrome.exe'),
        // مسارات Chrome المثبت على النظام
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // مسارات Edge الجديد (بديل Chrome)
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      );

      pdfLogger.log('INFO', 'CHROMIUM', `Searching ${possiblePaths.length} possible Chromium paths`);

      // البحث في المسارات مع دعم wildcards
      for (const searchPath of possiblePaths) {
        if (searchPath.includes('*')) {
          // Handle wildcard paths
          const basePath = searchPath.substring(0, searchPath.indexOf('*'));
          try {
            if (fs.existsSync(basePath)) {
              const dirs = fs.readdirSync(basePath);
              for (const dir of dirs) {
                const fullPath = path.join(basePath, dir, searchPath.substring(searchPath.indexOf('*') + 1));
                if (fs.existsSync(fullPath)) {
                  pdfLogger.logChromiumPath(fullPath);
                  return fullPath;
                }
              }
            }
          } catch (e) {
            continue;
          }
        } else {
          // Direct path check
          if (fs.existsSync(searchPath)) {
            pdfLogger.logChromiumPath(searchPath);
            return searchPath;
          }
        }
      }

      pdfLogger.log('ERROR', 'CHROMIUM', 'No Chromium executable found in any location');
      return undefined;

    } catch (error) {
      pdfLogger.log('ERROR', 'CHROMIUM', 'Failed to resolve Chromium path', {
        error: error instanceof Error ? error.message : String(error)
      });
      return undefined;
    }
  }

  /**
   * تهيئة المتصفح
   * Initialize browser
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      let chromiumPath: string | undefined;

      try {
        const { app } = require('electron');
        const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

        pdfLogger.log('INFO', 'PUPPETEER', 'Starting browser initialization', {
          stage: 'INIT',
          details: { isDev, isPackaged: app.isPackaged }
        });

        // الحصول على مسار Chromium الصحيح
        chromiumPath = this.getChromiumExecutablePath();

        if (!chromiumPath) {
          const error = new Error('Chromium executable not found');
          // Record Chromium error
          const monitor = ProductionMonitor.getInstance();
          monitor.recordChromiumError(error.message, { stage: 'INIT', executablePath: chromiumPath });

          pdfLogger.logPuppeteerError(error);
          throw error;
        }

        // Production-optimized launch options
        const launchOptions: any = {
          executablePath: chromiumPath, // استخدام مسار Chromium المُحدد
          headless: true,
          devtools: false,
          timeout: isDev ? 60000 : 30000, // Shorter timeout in production
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
            '--force-color-profile=srgb',
            '--disable-color-correct-rendering',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--run-all-compositor-stages-before-draw'
          ],
          dumpio: false,
          ignoreHTTPSErrors: true,
          ignoreDefaultArgs: ['--disable-extensions']
        };

        // Additional production optimizations
        if (!isDev) {
          launchOptions.args.push(
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--password-store=basic',
            '--use-mock-keychain'
          );
        }

        pdfLogger.logPuppeteerInit({
          chromiumPath,
          args: launchOptions.args,
          totalArgs: launchOptions.args.length
        });

        this.browser = await puppeteer.launch(launchOptions);

        // Test browser connection
        const version = await this.browser.version();
        pdfLogger.log('INFO', 'PUPPETEER', 'Browser initialized successfully', {
          stage: 'INIT',
          details: { version, chromiumPath }
        });

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Record Chromium error during browser launch
        const monitor = ProductionMonitor.getInstance();
        monitor.recordChromiumError(err.message, { stage: 'LAUNCH', chromiumPath: chromiumPath });

        pdfLogger.logPuppeteerError(err);
        this.browser = null;
        throw err;
      }
    }
  }

  /**
   * إنتاج PDF للتذكرة
   * Generate PDF for ticket
   */
  async generateTicketPDF(ticketData: TicketData, outputPath?: string): Promise<string | null> {
    const storageManager = PDFStorageManager.getInstance();
    const monitor = ProductionMonitor.getInstance();

    // Log PDF generation attempt
    monitor.recordPDFGenerationAttempt(ticketData.ticket_number);

    pdfLogger.log('INFO', 'PUPPETEER', 'Starting PDF generation', {
      stage: 'INIT',
      ticketNumber: ticketData.ticket_number,
      details: {
        serviceName: ticketData.service_name,
        printSource: ticketData.print_source,
        hasCustomPath: !!outputPath
      }
    });

    // Check if already being generated
    if (storageManager.isGeneratingPdf(ticketData.ticket_number, ticketData.service_name)) {
      pdfLogger.log('WARN', 'PUPPETEER', 'PDF generation already in progress', {
        stage: 'INIT',
        ticketNumber: ticketData.ticket_number
      });

      // Wait up to 5 seconds for the other generation to finish
      let attempts = 0;
      while (attempts < 50) {
        const finalPath = outputPath || storageManager.getTicketPath(
          ticketData.ticket_number,
          ticketData.service_name
        );

        if (fs.existsSync(finalPath)) {
          pdfLogger.log('INFO', 'PUPPETEER', 'Found existing PDF while waiting', {
            stage: 'GENERATE',
            ticketNumber: ticketData.ticket_number,
            details: { path: finalPath }
          });
          return finalPath;
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        attempts++;
      }

      pdfLogger.log('ERROR', 'PUPPETEER', 'Timeout waiting for PDF generation', {
        stage: 'GENERATE',
        ticketNumber: ticketData.ticket_number,
        details: { waitAttempts: attempts }
      });
      return null;
    }

    // Start tracking this generation
    if (!storageManager.startPdfGeneration(ticketData.ticket_number, ticketData.service_name)) {
      pdfLogger.log('ERROR', 'PUPPETEER', 'Failed to acquire generation lock', {
        stage: 'INIT',
        ticketNumber: ticketData.ticket_number
      });
      return null;
    }

    try {
      pdfLogger.log('INFO', 'PUPPETEER', 'Initializing browser for PDF generation', {
        stage: 'INIT',
        ticketNumber: ticketData.ticket_number
      });

      await this.initBrowser();
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      pdfLogger.log('INFO', 'PUPPETEER', 'Creating new page', {
        stage: 'GENERATE',
        ticketNumber: ticketData.ticket_number
      });

      const page = await this.browser.newPage();

      // Optimize page for faster B&W rendering
      await page.emulateMediaType('print');
      await page.setViewport({
        width: 302,
        height: 794,
        deviceScaleFactor: 1 // Optimized for faster rendering
      });

      pdfLogger.log('INFO', 'PUPPETEER', 'Generating HTML content', {
        stage: 'GENERATE',
        ticketNumber: ticketData.ticket_number
      });

      const html = generateThermalTicketHTML(ticketData);

      // Faster content loading - no wait for network resources
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Faster than 'load'
        timeout: 10000 // Reduced timeout for speed
      });

      pdfLogger.log('INFO', 'PUPPETEER', 'Loading fonts', {
        stage: 'GENERATE',
        ticketNumber: ticketData.ticket_number
      });

      // Optimized font loading with timeout for faster generation
      try {
        await Promise.race([
          page.evaluateHandle('document.fonts.ready'),
          new Promise(resolve => setTimeout(resolve, 1000)) // Max 1 second wait
        ]);
        pdfLogger.log('INFO', 'PUPPETEER', 'Fonts loaded successfully', {
          stage: 'GENERATE',
          ticketNumber: ticketData.ticket_number
        });
      } catch (e) {
        // Continue without fonts if they fail to load quickly
        pdfLogger.log('WARN', 'PUPPETEER', 'Font loading timeout - using default fonts', {
          stage: 'GENERATE',
          ticketNumber: ticketData.ticket_number
        });
      }

      // Determine output path
      const finalPath = outputPath || storageManager.getTicketPath(
        ticketData.ticket_number,
        ticketData.service_name
      );

      pdfLogger.log('INFO', 'PUPPETEER', 'Preparing output directory', {
        stage: 'SAVE',
        ticketNumber: ticketData.ticket_number,
        details: { outputPath: finalPath }
      });

      // Ensure directory exists with better error handling
      const directory = path.dirname(finalPath);
      if (!fs.existsSync(directory)) {
        try {
          fs.mkdirSync(directory, { recursive: true });
          pdfLogger.log('INFO', 'PUPPETEER', 'Created output directory', {
            stage: 'SAVE',
            ticketNumber: ticketData.ticket_number,
            details: { directory }
          });
        } catch (dirError) {
          pdfLogger.log('ERROR', 'PUPPETEER', 'Failed to create output directory', {
            stage: 'SAVE',
            ticketNumber: ticketData.ticket_number,
            details: { directory },
            error: dirError instanceof Error ? dirError.message : String(dirError)
          });
          throw new Error(`Failed to create output directory: ${directory}`);
        }
      }

      pdfLogger.log('INFO', 'PUPPETEER', 'Starting PDF generation', {
        stage: 'GENERATE',
        ticketNumber: ticketData.ticket_number,
        details: { path: finalPath }
      });

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

      pdfLogger.log('INFO', 'PUPPETEER', 'PDF generation completed - verifying file', {
        stage: 'SAVE',
        ticketNumber: ticketData.ticket_number
      });

      // Verify PDF was created and has content
      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        if (stats.size > 0) {
          // Record successful PDF generation
          monitor.recordPDFGenerationSuccess(ticketData.ticket_number, finalPath);

          pdfLogger.logPDFGeneration(ticketData.ticket_number, finalPath, true);
          pdfLogger.log('INFO', 'PUPPETEER', 'PDF verification successful', {
            stage: 'SAVE',
            ticketNumber: ticketData.ticket_number,
            details: { size: stats.size, path: finalPath }
          });
          return finalPath;
        } else {
          // Record failure due to empty PDF
          monitor.recordPDFGenerationFailure(ticketData.ticket_number, 'Generated PDF file is empty');

          pdfLogger.log('ERROR', 'PUPPETEER', 'Generated PDF file is empty', {
            stage: 'SAVE',
            ticketNumber: ticketData.ticket_number,
            details: { path: finalPath }
          });
          // Try to remove empty file
          try {
            fs.unlinkSync(finalPath);
          } catch (unlinkError) {
            pdfLogger.log('ERROR', 'PUPPETEER', 'Failed to remove empty PDF', {
              stage: 'CLEANUP',
              ticketNumber: ticketData.ticket_number,
              error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError)
            });
          }
          throw new Error('Generated PDF file is empty');
        }
      } else {
        // Record failure due to PDF not being created
        monitor.recordPDFGenerationFailure(ticketData.ticket_number, 'PDF file was not created');

        pdfLogger.log('ERROR', 'PUPPETEER', 'PDF file was not created', {
          stage: 'SAVE',
          ticketNumber: ticketData.ticket_number,
          details: { expectedPath: finalPath }
        });
        throw new Error('PDF file was not created');
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Record general PDF generation failure
      monitor.recordPDFGenerationFailure(ticketData.ticket_number, err.message);

      // Check if this is a Chromium-related error
      if (err.message.includes('chromium') || err.message.includes('Chromium') || err.message.includes('browser')) {
        monitor.recordChromiumError(err.message, { ticketNumber: ticketData.ticket_number });
      }

      pdfLogger.logPuppeteerError(err, ticketData.ticket_number);
      pdfLogger.logPDFGeneration(ticketData.ticket_number, outputPath || 'unknown', false);
      return null;
    } finally {
      // Always release the lock
      storageManager.finishPdfGeneration(ticketData.ticket_number, ticketData.service_name);
      pdfLogger.log('INFO', 'PUPPETEER', 'PDF generation session ended', {
        stage: 'CLEANUP',
        ticketNumber: ticketData.ticket_number
      });
    }
  }

  /**
   * إغلاق المتصفح
   * Close browser
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        pdfLogger.log('INFO', 'PUPPETEER', 'Starting browser cleanup', {
          stage: 'CLEANUP'
        });

        await this.browser.close();
        this.browser = null;

        pdfLogger.log('INFO', 'PUPPETEER', 'Browser cleanup completed', {
          stage: 'CLEANUP'
        });
      } catch (error) {
        pdfLogger.log('ERROR', 'PUPPETEER', 'Browser cleanup failed', {
          stage: 'CLEANUP',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }


}

export default PuppeteerPDFGenerator;
