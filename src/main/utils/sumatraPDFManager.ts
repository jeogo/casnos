/**
 * 🖨️ SumatraPDF Manager - Utility for handling SumatraPDF printing
 * Manages SumatraPDF executable discovery, settings, and print command execution
 */

import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

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
    const possibleSumatraPaths = [
      // Production path (when app is packaged)
      path.join(process.resourcesPath, 'assets', 'SumatraPDF.exe'),
      // Development paths
      path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe'),
      path.join(__dirname, '../../../resources/assets/SumatraPDF.exe')
    ];

    console.log('[SumatraPDF] 🔍 Searching for SumatraPDF.exe...');
    for (const testPath of possibleSumatraPaths) {
      if (fs.existsSync(testPath)) {
        this.sumatraPath = path.resolve(testPath);
        console.log(`[SumatraPDF] ✅ Found at: ${this.sumatraPath}`);
        break;
      }
    }

    if (!this.sumatraPath) {
      console.warn('[SumatraPDF] ❌ SumatraPDF not found - will use fallback printing');
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
    try {
      // Verify PDF file exists
      if (!fs.existsSync(pdfPath)) {
        return {
          success: false,
          message: `PDF file not found: ${pdfPath}`,
          method: 'failed',
          error: 'FILE_NOT_FOUND'
        };
      }

      // Check if SumatraPDF is available
      if (!this.isAvailable()) {
        console.log('[SumatraPDF] 🔄 SumatraPDF not available, trying Windows fallback...');
        return await this.windowsFallback(pdfPath);
      }

      // Construct print command
      const command = this.buildPrintCommand(pdfPath, options);
      console.log(`[SumatraPDF] 🚀 Executing command: ${command}`);

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
          console.log(`[SumatraPDF] 📄 stdout: ${stdout.trim()}`);
        }

        // Check for warnings in stderr
        if (stderr && stderr.trim()) {
          console.warn(`[SumatraPDF] ⚠️ Print warnings: ${stderr}`);
        }

        const printerName = options.printerName || 'default printer';
        return {
          success: true,
          message: `🎫 Print job sent to ${printerName} via SumatraPDF`,
          method: 'SumatraPDF',
          command
        };

      } catch (execError: any) {
        console.error('[SumatraPDF] ❌ Print command execution failed:', execError);

        // Check for specific error types
        if (execError.code === 'ENOENT') {
          return {
            success: false,
            message: '❌ SumatraPDF executable not found',
            method: 'failed',
            error: 'EXECUTABLE_NOT_FOUND'
          };
        }

        if (execError.killed) {
          return {
            success: false,
            message: '❌ Print command timed out',
            method: 'failed',
            error: 'TIMEOUT'
          };
        }

        // Try Windows fallback for execution errors
        console.log('[SumatraPDF] 🔄 Command failed, trying Windows fallback...');
        return await this.windowsFallback(pdfPath);
      }

    } catch (error) {
      console.error('[SumatraPDF] ❌ Print process failed:', error);

      // Try Windows fallback as last resort
      console.log('[SumatraPDF] 🔄 Attempting Windows fallback...');
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
    console.log(`[SumatraPDF] 🔧 Built command: ${command}`);

    return command;
  }

  /**
   * Windows fallback - open PDF in default viewer for manual printing
   */
  private async windowsFallback(pdfPath: string): Promise<SumatraPrintResult> {
    try {
      await execAsync(`start "" "${pdfPath}"`, { timeout: 5000 });

      return {
        success: true,
        message: '🖨️ PDF opened in default viewer - please print manually',
        method: 'Windows-Fallback'
      };
    } catch (fallbackError) {
      console.error('[SumatraPDF] ❌ Windows fallback failed:', fallbackError);

      return {
        success: false,
        message: `❌ All print methods failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
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
