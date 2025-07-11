/**
 * 🔍 Production PDF Logger - نظام مراقبة PDF للإنتاج
 *
 * يسجل جميع عمليات PDF بتفاصيل شاملة في ملف نصي
 * للمراقبة والتشخيص في بيئة الإنتاج
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PDFLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: 'PUPPETEER' | 'STORAGE' | 'SUMATRA' | 'SYSTEM' | 'CHROMIUM';
  message: string;
  details?: any;
  ticketNumber?: string;
  stage?: 'INIT' | 'GENERATE' | 'SAVE' | 'PRINT' | 'CLEANUP';
  error?: string;
  stackTrace?: string;
}

export class ProductionPDFLogger {
  private static instance: ProductionPDFLogger;
  private logFilePath: string = '';
  private logBuffer: PDFLogEntry[] = [];
  private isEnabled: boolean = true;

  private constructor() {
    this.initializeLogFile();
  }

  static getInstance(): ProductionPDFLogger {
    if (!ProductionPDFLogger.instance) {
      ProductionPDFLogger.instance = new ProductionPDFLogger();
    }
    return ProductionPDFLogger.instance;
  }

  private initializeLogFile(): void {
    try {
      const { app } = require('electron');
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

      if (isDev) {
        // Development: مجلد المشروع
        this.logFilePath = path.join(process.cwd(), 'logs', 'pdf-production.log');
      } else {
        // Production: AppData
        const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'casnose');
        const logsDir = path.join(appDataPath, 'logs');
        this.logFilePath = path.join(logsDir, 'pdf-production.log');
      }

      // إنشاء مجلد السجلات
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // بدء سجل جديد
      this.writeHeader();

      console.log(`[PDF Logger] 📝 Log file initialized: ${this.logFilePath}`);
    } catch (error) {
      console.error('[PDF Logger] ❌ Failed to initialize log file:', error);
      this.isEnabled = false;
    }
  }

  private writeHeader(): void {
    const header = `
================================================================================
🔍 CASNOS PDF Production Logger - بدء جلسة جديدة
================================================================================
التاريخ: ${new Date().toLocaleString('ar-SA')}
البيئة: ${process.env.NODE_ENV || 'unknown'}
المنصة: ${process.platform} ${process.arch}
Node.js: ${process.version}
PID: ${process.pid}
Working Dir: ${process.cwd()}
Resources Path: ${process.resourcesPath || 'N/A'}
================================================================================

`;
    this.writeToFile(header);
  }

  private writeToFile(content: string): void {
    if (!this.isEnabled) return;

    try {
      fs.appendFileSync(this.logFilePath, content, 'utf8');
    } catch (error) {
      console.error('[PDF Logger] ❌ Failed to write to log file:', error);
    }
  }

  private formatLogEntry(entry: PDFLogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString('ar-SA');
    const level = entry.level.padEnd(5);
    const category = entry.category.padEnd(10);
    const stage = entry.stage ? `[${entry.stage}]` : '';
    const ticket = entry.ticketNumber ? `[#${entry.ticketNumber}]` : '';

    let formatted = `[${timestamp}] ${level} ${category} ${stage}${ticket} ${entry.message}\n`;

    if (entry.details) {
      formatted += `         Details: ${JSON.stringify(entry.details, null, 2)}\n`;
    }

    if (entry.error) {
      formatted += `         Error: ${entry.error}\n`;
    }

    if (entry.stackTrace) {
      formatted += `         Stack: ${entry.stackTrace}\n`;
    }

    formatted += '\n';
    return formatted;
  }

  public log(
    level: PDFLogEntry['level'],
    category: PDFLogEntry['category'],
    message: string,
    options: Partial<PDFLogEntry> = {}
  ): void {
    if (!this.isEnabled) return;

    const entry: PDFLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...options
    };

    // إضافة إلى الـ buffer
    this.logBuffer.push(entry);

    // كتابة فورية للأخطاء
    if (level === 'ERROR' || level === 'WARN') {
      this.flush();
    }

    // كتابة دورية كل 10 إدخالات
    if (this.logBuffer.length >= 10) {
      this.flush();
    }

    // طباعة في الكونسول أيضاً
    const consoleMessage = `[${category}] ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, options.details || '');
        break;
      case 'WARN':
        console.warn(consoleMessage, options.details || '');
        break;
      case 'DEBUG':
        console.debug(consoleMessage, options.details || '');
        break;
      default:
        console.log(consoleMessage, options.details || '');
    }
  }

  public flush(): void {
    if (!this.isEnabled || this.logBuffer.length === 0) return;

    try {
      const content = this.logBuffer.map(entry => this.formatLogEntry(entry)).join('');
      this.writeToFile(content);
      this.logBuffer = [];
    } catch (error) {
      console.error('[PDF Logger] ❌ Failed to flush log buffer:', error);
    }
  }

  public getLogPath(): string {
    return this.logFilePath;
  }

  public disable(): void {
    this.flush();
    this.isEnabled = false;
  }

  // مساعدات سريعة
  public logPuppeteerInit(details: any): void {
    this.log('INFO', 'PUPPETEER', 'Initializing Puppeteer browser', {
      stage: 'INIT',
      details
    });
  }

  public logPuppeteerError(error: Error, ticketNumber?: string): void {
    this.log('ERROR', 'PUPPETEER', 'Puppeteer operation failed', {
      stage: 'GENERATE',
      ticketNumber,
      error: error.message,
      stackTrace: error.stack
    });
  }

  public logChromiumPath(path: string | null): void {
    this.log('INFO', 'CHROMIUM', 'Chromium executable path resolved', {
      stage: 'INIT',
      details: { path, exists: path ? fs.existsSync(path) : false }
    });
  }

  public logPDFGeneration(ticketNumber: string, outputPath: string, success: boolean): void {
    this.log(success ? 'INFO' : 'ERROR', 'STORAGE',
      `PDF generation ${success ? 'completed' : 'failed'}`, {
        stage: 'GENERATE',
        ticketNumber,
        details: { outputPath, success }
      });
  }

  public logSumatraOperation(command: string, success: boolean, error?: string): void {
    this.log(success ? 'INFO' : 'ERROR', 'SUMATRA',
      `SumatraPDF operation ${success ? 'completed' : 'failed'}`, {
        stage: 'PRINT',
        details: { command },
        error
      });
  }

  public logSystemDiagnostics(diagnostics: any): void {
    this.log('INFO', 'SYSTEM', 'System diagnostics collected', {
      stage: 'INIT',
      details: diagnostics
    });
  }
}

// Singleton instance
export const pdfLogger = ProductionPDFLogger.getInstance();

// Auto-flush on process exit
process.on('exit', () => {
  pdfLogger.flush();
});

process.on('SIGINT', () => {
  pdfLogger.flush();
  process.exit(0);
});

process.on('SIGTERM', () => {
  pdfLogger.flush();
  process.exit(0);
});

export default ProductionPDFLogger;
