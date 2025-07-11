/**
 * 🖨️ SumatraPDF Manager - Utility for handling SumatraPDF printing
 * Manages SumatraPDF executable discovery, settings, and print command execution
 */

import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pdfLogger } from './productionPDFLogger';
import ProductionMonitor from './productionMonitor';

const execAsync = promisify(exec);

export interface SumatraPrintOptions {
  printerName?: string;
  silent?: boolean;
  useDefaultPrinter?: boolean;
  timeout?: number;
}

export interface SumatraPrintResult {
  success: boolean;
  message: string;
  method: 'SumatraPDF' | 'Windows-Fallback' | 'failed';
  command?: string;
  error?: string;
}

export class SumatraPDFManager {
  private static instance: SumatraPDFManager;
  private sumatraPath: string | null = null;
  private settingsPath: string | null = null;

  private constructor() {
    this.initializePaths();
  }

  static getInstance(): SumatraPDFManager {
    if (!SumatraPDFManager.instance) {
      SumatraPDFManager.instance = new SumatraPDFManager();
    }
    return SumatraPDFManager.instance;
  }

  /**
   * Initialize SumatraPDF and settings paths
   */
  private initializePaths(): void {
    const { app } = require('electron');
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    pdfLogger.log('INFO', 'SUMATRA', 'Starting SumatraPDF initialization', {
      stage: 'INIT',
      details: {
        isDev,
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath || 'undefined',
        cwd: process.cwd(),
        dirname: __dirname
      }
    });

    const possibleSumatraPaths: string[] = [];

    if (isDev) {
      // Development paths (prioritize current working directory)
      possibleSumatraPaths.push(
        path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe'),
        path.join(__dirname, '../../resources/assets/SumatraPDF.exe'),
        path.join(__dirname, '../../../resources/assets/SumatraPDF.exe'),
        path.join(__dirname, '../../../../resources/assets/SumatraPDF.exe')
      );
    } else {
      // Production paths - comprehensive search
      // First check process.resourcesPath (main production path)
      if (process.resourcesPath) {
        possibleSumatraPaths.push(
          path.join(process.resourcesPath, 'assets', 'SumatraPDF.exe'),
          path.join(process.resourcesPath, 'SumatraPDF.exe'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'assets', 'SumatraPDF.exe'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'SumatraPDF.exe')
        );
      }

      // Check relative to executable
      possibleSumatraPaths.push(
        path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe'),
        path.join(process.cwd(), 'assets', 'SumatraPDF.exe'),
        path.join(path.dirname(process.execPath), 'resources', 'assets', 'SumatraPDF.exe'),
        path.join(path.dirname(process.execPath), 'assets', 'SumatraPDF.exe')
      );

      // Check relative to __dirname (in case of asar)
      possibleSumatraPaths.push(
        path.join(__dirname, '../../resources/assets/SumatraPDF.exe'),
        path.join(__dirname, '../../../resources/assets/SumatraPDF.exe'),
        path.join(__dirname, '../../../../resources/assets/SumatraPDF.exe'),
        path.join(__dirname, '../../../../../resources/assets/SumatraPDF.exe')
      );
    }

    pdfLogger.log('INFO', 'SUMATRA', `Searching for SumatraPDF.exe in ${possibleSumatraPaths.length} locations`, {
      stage: 'INIT',
      details: { paths: possibleSumatraPaths }
    });

    for (const testPath of possibleSumatraPaths) {
      pdfLogger.log('DEBUG', 'SUMATRA', `Checking SumatraPDF path: ${testPath}`, {
        stage: 'INIT'
      });

      if (fs.existsSync(testPath)) {
        this.sumatraPath = path.resolve(testPath);
        pdfLogger.log('INFO', 'SUMATRA', 'SumatraPDF executable found', {
          stage: 'INIT',
          details: { path: this.sumatraPath }
        });
        break;
      }
    }

    if (!this.sumatraPath) {
      pdfLogger.log('ERROR', 'SUMATRA', 'SumatraPDF executable not found in any location', {
        stage: 'INIT',
        details: { searchedPaths: possibleSumatraPaths }
      });
    }

    // Initialize settings path
    const settingsPaths: string[] = [];
    if (this.sumatraPath) {
      const sumatraDir = path.dirname(this.sumatraPath);
      settingsPaths.push(
        path.join(sumatraDir, 'SumatraPDF-settings.txt'),
        path.join(sumatraDir, '..', 'SumatraPDF-settings.txt')
      );
    }

    for (const settingsPath of settingsPaths) {
      if (fs.existsSync(settingsPath)) {
        this.settingsPath = path.resolve(settingsPath);
        pdfLogger.log('INFO', 'SUMATRA', 'SumatraPDF settings file found', {
          stage: 'INIT',
          details: { path: this.settingsPath }
        });
        break;
      }
    }

    if (!this.settingsPath && this.sumatraPath) {
      pdfLogger.log('WARN', 'SUMATRA', 'SumatraPDF settings file not found - using defaults', {
        stage: 'INIT'
      });
    }
  }

  /**
   * Check if SumatraPDF is available
   */
  isAvailable(): boolean {
    return this.sumatraPath !== null && fs.existsSync(this.sumatraPath);
  }

  /**
   * Get the path to SumatraPDF executable
   */
  getExecutablePath(): string | null {
    return this.sumatraPath;
  }

  /**
   * Get the path to SumatraPDF settings file
   */
  getSettingsPath(): string | null {
    return this.settingsPath;
  }

  /**
   * Print a PDF file using SumatraPDF
   */
  async printPDF(pdfPath: string, options: SumatraPrintOptions = {}): Promise<SumatraPrintResult> {
    const monitor = ProductionMonitor.getInstance();

    try {
      // Extract ticket number from PDF path for monitoring
      const ticketNumber = path.basename(pdfPath, '.pdf');
      monitor.recordPrintAttempt(ticketNumber, pdfPath);

      pdfLogger.log('INFO', 'SUMATRA', 'Starting PDF print operation', {
        stage: 'PRINT',
        details: {
          pdfPath,
          printerName: options.printerName || 'default',
          silent: options.silent,
          timeout: options.timeout || 15000
        }
      });

      // Verify PDF file exists
      if (!fs.existsSync(pdfPath)) {
        monitor.recordPrintFailure(ticketNumber, `PDF file not found: ${pdfPath}`);
        monitor.recordStorageError('PDF file not found', { pdfPath });

        pdfLogger.log('ERROR', 'SUMATRA', 'PDF file not found', {
          stage: 'PRINT',
          details: { pdfPath }
        });
        return {
          success: false,
          message: `PDF file not found: ${pdfPath}`,
          method: 'failed',
          error: 'FILE_NOT_FOUND'
        };
      }

      // Check if SumatraPDF is available
      if (!this.isAvailable()) {
        monitor.recordSumatraError('SumatraPDF not available', { sumatraPath: this.sumatraPath });

        pdfLogger.log('WARN', 'SUMATRA', 'SumatraPDF not available, using Windows fallback', {
          stage: 'PRINT',
          details: { sumatraPath: this.sumatraPath }
        });
        return await this.windowsFallback(pdfPath);
      }

      // Construct print command
      const command = this.buildPrintCommand(pdfPath, options);

      pdfLogger.log('INFO', 'SUMATRA', 'Executing print command', {
        stage: 'PRINT',
        details: { command }
      });

      // Execute print command with enhanced error handling
      const timeout = options.timeout || 15000;

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout,
          encoding: 'utf8',
          windowsHide: true
        });

        // Log output for debugging
        if (stdout && stdout.trim()) {
          pdfLogger.log('DEBUG', 'SUMATRA', 'Print command stdout', {
            stage: 'PRINT',
            details: { output: stdout.trim() }
          });
        }

        // Check for warnings in stderr
        if (stderr && stderr.trim()) {
          pdfLogger.log('WARN', 'SUMATRA', 'Print command warnings', {
            stage: 'PRINT',
            details: { warnings: stderr.trim() }
          });
        }

        const printerName = options.printerName || 'default printer';
        const result = {
          success: true,
          message: `Print job sent to ${printerName} via SumatraPDF`,
          method: 'SumatraPDF' as const,
          command
        };

        // Record successful print
        monitor.recordPrintSuccess(ticketNumber, 'SumatraPDF');

        pdfLogger.logSumatraOperation(command, true);
        return result;

      } catch (execError: any) {
        pdfLogger.log('ERROR', 'SUMATRA', 'Print command execution failed', {
          stage: 'PRINT',
          details: {
            command,
            error: execError.message,
            code: execError.code,
            killed: execError.killed
          }
        });

        // Check for specific error types
        if (execError.code === 'ENOENT') {
          monitor.recordPrintFailure(ticketNumber, 'SumatraPDF executable not found');
          monitor.recordSumatraError('Executable not found', { code: execError.code });

          return {
            success: false,
            message: 'SumatraPDF executable not found',
            method: 'failed',
            error: 'EXECUTABLE_NOT_FOUND'
          };
        }

        if (execError.killed) {
          monitor.recordPrintFailure(ticketNumber, 'Print command timed out');
          monitor.recordSumatraError('Command timeout', { timeout: options.timeout || 15000 });

          return {
            success: false,
            message: 'Print command timed out',
            method: 'failed',
            error: 'TIMEOUT'
          };
        }

        // Record generic print failure before trying fallback
        monitor.recordPrintFailure(ticketNumber, `SumatraPDF execution failed: ${execError.message}`);
        monitor.recordSumatraError(execError.message, { code: execError.code });

        // Try Windows fallback for execution errors
        pdfLogger.log('WARN', 'SUMATRA', 'Command failed, attempting Windows fallback', {
          stage: 'PRINT'
        });
        return await this.windowsFallback(pdfPath);
      }

    } catch (error) {
      pdfLogger.log('ERROR', 'SUMATRA', 'Print process failed', {
        stage: 'PRINT',
        error: error instanceof Error ? error.message : String(error)
      });

      // Try Windows fallback as last resort
      pdfLogger.log('WARN', 'SUMATRA', 'Attempting Windows fallback as last resort', {
        stage: 'PRINT'
      });
      return await this.windowsFallback(pdfPath);
    }
  }

  /**
   * Build the SumatraPDF print command
   */
  private buildPrintCommand(pdfPath: string, options: SumatraPrintOptions): string {
    if (!this.sumatraPath) {
      throw new Error('SumatraPDF path not available');
    }

    // Ensure paths are properly resolved and escaped
    const executablePath = path.resolve(this.sumatraPath);
    const pdfFilePath = path.resolve(pdfPath);

    const parts = [`"${executablePath}"`];

    // Add printer specification
    if (options.printerName && options.printerName !== 'default') {
      parts.push('-print-to', `"${options.printerName}"`);
    } else {
      parts.push('-print-to-default');
    }

    // Add silent flag - ALWAYS silent, no PDF viewer window
    parts.push('-silent');

    // Add exit when done flag for automated printing
    parts.push('-exit-when-done');

    // Add PDF file path (must be last)
    parts.push(`"${pdfFilePath}"`);

    const command = parts.join(' ');

    pdfLogger.log('DEBUG', 'SUMATRA', 'Built print command', {
      stage: 'PRINT',
      details: {
        command,
        executablePath,
        pdfFilePath,
        printerName: options.printerName || 'default'
      }
    });

    return command;
  }

  /**
   * Windows fallback - open PDF in default viewer for manual printing
   */
  private async windowsFallback(pdfPath: string): Promise<SumatraPrintResult> {
    const monitor = ProductionMonitor.getInstance();
    const ticketNumber = path.basename(pdfPath, '.pdf');

    try {
      pdfLogger.log('INFO', 'SUMATRA', 'Using Windows fallback method', {
        stage: 'PRINT',
        details: { pdfPath }
      });

      await execAsync(`start "" "${pdfPath}"`, { timeout: 5000 });

      pdfLogger.log('INFO', 'SUMATRA', 'PDF opened in default viewer', {
        stage: 'PRINT',
        details: { method: 'Windows-Fallback' }
      });

      // Record successful fallback print
      monitor.recordPrintSuccess(ticketNumber, 'Windows-Fallback');

      return {
        success: true,
        message: 'PDF opened in default viewer - please print manually',
        method: 'Windows-Fallback'
      };
    } catch (fallbackError) {
      pdfLogger.log('ERROR', 'SUMATRA', 'Windows fallback failed', {
        stage: 'PRINT',
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });

      // Record complete print failure
      monitor.recordPrintFailure(ticketNumber, `All print methods failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);

      return {
        success: false,
        message: `All print methods failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
        method: 'failed',
        error: 'ALL_METHODS_FAILED'
      };
    }
  }



  /**
   * Get detailed diagnostic information
   */
  getDiagnostics(): {
    executablePath: string | null;
    executableExists: boolean;
    settingsPath: string | null;
    settingsExists: boolean;
    isAvailable: boolean;
  } {
    return {
      executablePath: this.sumatraPath,
      executableExists: this.sumatraPath ? fs.existsSync(this.sumatraPath) : false,
      settingsPath: this.settingsPath,
      settingsExists: this.settingsPath ? fs.existsSync(this.settingsPath) : false,
      isAvailable: this.isAvailable()
    };
  }
}

export default SumatraPDFManager;
