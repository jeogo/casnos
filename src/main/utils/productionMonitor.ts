/**
 * 📊 نظام المراقبة الشامل للإنتاج
 * Production Monitoring System
 */

import * as fs from 'fs';
import * as path from 'path';

export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private logFile: string;
  private stats = {
    pdfGenerationAttempts: 0,
    pdfGenerationSuccesses: 0,
    pdfGenerationFailures: 0,
    printAttempts: 0,
    printSuccesses: 0,
    printFailures: 0,
    chromiumErrors: 0,
    storageErrors: 0,
    sumatraErrors: 0,
    startTime: Date.now()
  };

  private constructor() {
    this.logFile = this.initializeLogFile();
    this.initializeMonitoring();
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  private initializeLogFile(): string {
    const { app } = require('electron');
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
      return path.join(process.cwd(), 'production-monitor.txt');
    } else {
      // Production: save to app data or executable directory
      const baseDir = process.resourcesPath || path.dirname(process.execPath);
      return path.join(baseDir, 'production-monitor.txt');
    }
  }

  private initializeMonitoring(): void {
    this.log('SYSTEM', 'Production monitoring initialized');

    // Log system info
    this.logSystemInfo();

    // Set up periodic reporting
    setInterval(() => {
      this.generatePeriodicReport();
    }, 30000); // Every 30 seconds
  }

  private logSystemInfo(): void {
    const { app } = require('electron');
    const systemInfo = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      environment: process.env.NODE_ENV,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      execPath: process.execPath,
      cwd: process.cwd(),
      memoryUsage: process.memoryUsage()
    };

    this.log('SYSTEM', 'System Information', systemInfo);
  }

  private log(category: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data: data || {}
    };

    const logLine = `[${logEntry.timestamp}] [${category}] ${message}`;
    const dataLine = data ? `    Data: ${JSON.stringify(data, null, 2)}` : '';

    const fullLogEntry = logLine + '\n' + dataLine + '\n' + '-'.repeat(80) + '\n';

    try {
      fs.appendFileSync(this.logFile, fullLogEntry);
    } catch (error) {
      console.error('Failed to write to monitor log:', error);
    }
  }

  // PDF Generation Monitoring
  recordPDFGenerationAttempt(ticketNumber: string): void {
    this.stats.pdfGenerationAttempts++;
    this.log('PDF', `PDF Generation Attempt #${this.stats.pdfGenerationAttempts}`, {
      ticketNumber,
      totalAttempts: this.stats.pdfGenerationAttempts
    });
  }

  recordPDFGenerationSuccess(ticketNumber: string, pdfPath: string): void {
    this.stats.pdfGenerationSuccesses++;
    this.log('PDF', `PDF Generation Success`, {
      ticketNumber,
      pdfPath,
      successCount: this.stats.pdfGenerationSuccesses,
      successRate: `${((this.stats.pdfGenerationSuccesses / this.stats.pdfGenerationAttempts) * 100).toFixed(1)}%`
    });
  }

  recordPDFGenerationFailure(ticketNumber: string, error: string): void {
    this.stats.pdfGenerationFailures++;
    this.log('PDF', `PDF Generation Failure`, {
      ticketNumber,
      error,
      failureCount: this.stats.pdfGenerationFailures,
      failureRate: `${((this.stats.pdfGenerationFailures / this.stats.pdfGenerationAttempts) * 100).toFixed(1)}%`
    });
  }

  // Print Monitoring
  recordPrintAttempt(ticketNumber: string, pdfPath: string): void {
    this.stats.printAttempts++;
    this.log('PRINT', `Print Attempt #${this.stats.printAttempts}`, {
      ticketNumber,
      pdfPath,
      totalAttempts: this.stats.printAttempts
    });
  }

  recordPrintSuccess(ticketNumber: string, method: string): void {
    this.stats.printSuccesses++;
    this.log('PRINT', `Print Success`, {
      ticketNumber,
      method,
      successCount: this.stats.printSuccesses,
      successRate: `${((this.stats.printSuccesses / this.stats.printAttempts) * 100).toFixed(1)}%`
    });
  }

  recordPrintFailure(ticketNumber: string, error: string): void {
    this.stats.printFailures++;
    this.log('PRINT', `Print Failure`, {
      ticketNumber,
      error,
      failureCount: this.stats.printFailures,
      failureRate: `${((this.stats.printFailures / this.stats.printAttempts) * 100).toFixed(1)}%`
    });
  }

  // Component-specific error recording
  recordChromiumError(error: string, details?: any): void {
    this.stats.chromiumErrors++;
    this.log('CHROMIUM', `Chromium Error #${this.stats.chromiumErrors}`, {
      error,
      details,
      totalChromiumErrors: this.stats.chromiumErrors
    });
  }

  recordStorageError(error: string, details?: any): void {
    this.stats.storageErrors++;
    this.log('STORAGE', `Storage Error #${this.stats.storageErrors}`, {
      error,
      details,
      totalStorageErrors: this.stats.storageErrors
    });
  }

  recordSumatraError(error: string, details?: any): void {
    this.stats.sumatraErrors++;
    this.log('SUMATRA', `SumatraPDF Error #${this.stats.sumatraErrors}`, {
      error,
      details,
      totalSumatraErrors: this.stats.sumatraErrors
    });
  }

  // Diagnostic methods
  runFullDiagnostics(): any {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.stats.startTime,
      stats: { ...this.stats },
      systemHealth: this.checkSystemHealth(),
      componentStatus: this.checkComponentStatus()
    };

    this.log('DIAGNOSTICS', 'Full System Diagnostics', diagnostics);
    return diagnostics;
  }

  private checkSystemHealth(): any {
    const memUsage = process.memoryUsage();
    return {
      memoryUsage: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
      },
      uptime: `${((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1)} minutes`
    };
  }

  private checkComponentStatus(): any {
    const { app } = require('electron');
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    const status = {
      environment: isDev ? 'development' : 'production',
      chromiumPath: this.findChromiumPath(),
      sumatraPath: this.findSumatraPath(),
      storageAccess: this.checkStorageAccess(),
      resourcesAccess: this.checkResourcesAccess()
    };

    return status;
  }

  private findChromiumPath(): string | null {
    const puppeteer = require('puppeteer');
    try {
      return puppeteer.executablePath();
    } catch (error) {
      return null;
    }
  }

  private findSumatraPath(): string | null {
    const possiblePaths = [
      path.join(process.resourcesPath || '', 'assets', 'SumatraPDF.exe'),
      path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe')
    ];

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
    return null;
  }

  private checkStorageAccess(): boolean {
    try {
      const testPath = path.join(process.cwd(), 'test-storage-access.txt');
      fs.writeFileSync(testPath, 'test');
      fs.unlinkSync(testPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private checkResourcesAccess(): boolean {
    try {
      const resourcesPath = process.resourcesPath || path.join(process.cwd(), 'resources');
      return fs.existsSync(resourcesPath);
    } catch (error) {
      return false;
    }
  }

  private generatePeriodicReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      uptimeMinutes: ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1),
      stats: { ...this.stats },
      rates: {
        pdfSuccessRate: this.stats.pdfGenerationAttempts > 0 ?
          `${((this.stats.pdfGenerationSuccesses / this.stats.pdfGenerationAttempts) * 100).toFixed(1)}%` : '0%',
        printSuccessRate: this.stats.printAttempts > 0 ?
          `${((this.stats.printSuccesses / this.stats.printAttempts) * 100).toFixed(1)}%` : '0%'
      }
    };

    this.log('REPORT', 'Periodic Status Report', report);
  }

  // Public API for external components
  getStats(): any {
    return { ...this.stats };
  }

  getLogFilePath(): string {
    return this.logFile;
  }

  exportDiagnostics(): string {
    const diagnostics = this.runFullDiagnostics();
    const exportPath = path.join(path.dirname(this.logFile), `casnos-diagnostics-${Date.now()}.json`);

    try {
      fs.writeFileSync(exportPath, JSON.stringify(diagnostics, null, 2));
      this.log('EXPORT', 'Diagnostics exported', { exportPath });
      return exportPath;
    } catch (error) {
      this.log('EXPORT', 'Failed to export diagnostics', { error: String(error) });
      return '';
    }
  }
}

export default ProductionMonitor;
