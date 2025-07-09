import * as path from 'path';
import * as fs from 'fs';
import { getCASNOSPaths, getDatedTicketsPath, getTicketFilePath, getTempFilePath } from '../../shared/pathUtils';

/**
 * مدير تخزين ملفات PDF للتذاكر
 * PDF Storage Manager for Tickets
 */
export class PDFStorageManager {
  private static instance: PDFStorageManager;
  private baseDir: string;
  private tempDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private activePdfGenerations: Set<string> = new Set(); // Track active PDF generations

  private constructor() {
    // Use AppData for PDF storage
    const paths = getCASNOSPaths();
    this.baseDir = paths.ticketsPath;
    this.tempDir = paths.tempPath;
    this.ensureDirectoryExists();

    // بدء تنظيف تلقائي كل ساعة
    this.startAutoCleanup();
  }

  static getInstance(): PDFStorageManager {
    if (!PDFStorageManager.instance) {
      PDFStorageManager.instance = new PDFStorageManager();
    }
    return PDFStorageManager.instance;
  }
    /**
   * إنشاء مسار للتذكرة مع تنظيم حسب التاريخ
   * Create ticket path with date organization
   * Format: service-name-number.pdf (no printer ID for local, include for network)
   */
  getTicketPath(ticketNumber: string, serviceName?: string, _printerId?: string): string {
    return getTicketFilePath(ticketNumber, serviceName);
  }

  /**
   * مسار للملفات المؤقتة
   * Path for temporary files
   */
  getTempPath(fileName: string): string {
    return getTempFilePath(fileName);
  }

  /**
   * مسار لملفات الاختبار
   * Path for test files
   */
  getTestPath(fileName: string): string {
    const testDir = path.join(this.tempDir, 'test-tickets');
    this.ensureDirectoryExists(testDir);
    return path.join(testDir, fileName);
  }

  /**
   * الحصول على المجلد الأساسي
   * Get base directory
   */
  getBaseDirectory(): string {
    return this.baseDir;
  }

  /**
   * الحصول على مجلد اليوم
   * Get today's folder
   */
  getTodayFolder(): string {
    return getDatedTicketsPath();
  }
    /**
   * بدء التنظيف التلقائي كل ساعة
   * Start automatic cleanup every hour
   */
  private startAutoCleanup(): void {
    // تنظيف فوري عند البدء
    this.cleanupOldFiles(1); // حذف الملفات الأقدم من ساعة واحدة

    // جدولة التنظيف كل ساعة (3600000 ميلي ثانية)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldFiles(1); // حذف الملفات الأقدم من ساعة واحدة
    }, 60 * 60 * 1000); // كل ساعة
  }
  /**
   * إيقاف التنظيف التلقائي
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  /**
   * تنظيف الملفات القديمة (محسن للتنظيف بالساعات)
   * Clean up old files (enhanced for hourly cleanup)
   */
  async cleanupOldFiles(hoursToKeep: number = 1): Promise<void> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursToKeep);

      let cleanedCount = 0;
      let totalSize = 0;

      // تنظيف الملفات في المجلدات اليومية
      const dirs = fs.readdirSync(this.baseDir, { withFileTypes: true });

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name.match(/^\d{4}-\d{2}-\d{2}$/) && dir.name !== 'temp') {
          const fullPath = path.join(this.baseDir, dir.name);
          const files = fs.readdirSync(fullPath);

          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const stats = fs.statSync(filePath);

            if (stats.mtime < cutoffTime) {
              totalSize += stats.size;
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }

          // حذف المجلد إذا كان فارغاً
          const remainingFiles = fs.readdirSync(fullPath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(fullPath);
          }
        }
      }

      // تنظيف الملفات المؤقتة أيضاً
      if (fs.existsSync(this.tempDir)) {
        const tempFiles = fs.readdirSync(this.tempDir, { withFileTypes: true });
        for (const file of tempFiles) {
          if (file.isFile()) {
            const filePath = path.join(this.tempDir, file.name);
            const stats = fs.statSync(filePath);
            if (stats.mtime < cutoffTime) {
              totalSize += stats.size;
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      }

    } catch (error) {
      // Error during cleanup
    }
  }

  /**
   * الحصول على إحصائيات الملفات
   * Get file statistics
   */
  getStorageStats(): { totalFiles: number; totalSize: number; folders: string[] } {
    try {
      const stats = { totalFiles: 0, totalSize: 0, folders: [] as string[] };

      const dirs = fs.readdirSync(this.baseDir, { withFileTypes: true });

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name !== 'temp') {
          const fullPath = path.join(this.baseDir, dir.name);
          const files = fs.readdirSync(fullPath);

          stats.folders.push(dir.name);
          stats.totalFiles += files.length;

          // حساب حجم الملفات
          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const fileStats = fs.statSync(filePath);
            stats.totalSize += fileStats.size;
          }
        }
      }

      return stats;
    } catch (error) {
      return { totalFiles: 0, totalSize: 0, folders: [] };
    }
  }

  /**
   * البحث عن تذكرة حسب الرقم
   * Search for ticket by number
   */
  findTicketFiles(ticketNumber: string): string[] {
    try {
      const foundFiles: string[] = [];

      const dirs = fs.readdirSync(this.baseDir, { withFileTypes: true });

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name !== 'temp') {
          const fullPath = path.join(this.baseDir, dir.name);
          const files = fs.readdirSync(fullPath);

          for (const file of files) {
            if (file.includes(`ticket-${ticketNumber}`) && file.endsWith('.pdf')) {
              foundFiles.push(path.join(fullPath, file));
            }
          }
        }
      }

      return foundFiles;
    } catch (error) {
      console.error('[PDF Storage] Error finding ticket files:', error);
      return [];
    }
  }

  /**
   * Check if a PDF is currently being generated
   */
  isGeneratingPdf(ticketNumber: string, serviceName?: string): boolean {
    const key = `${serviceName || ''}-${ticketNumber}`;
    return this.activePdfGenerations.has(key);
  }

  /**
   * Start tracking a PDF generation
   */
  startPdfGeneration(ticketNumber: string, serviceName?: string): boolean {
    const key = `${serviceName || ''}-${ticketNumber}`;
    if (this.activePdfGenerations.has(key)) {
      return false; // Already being generated
    }
    this.activePdfGenerations.add(key);
    return true;
  }

  /**
   * Finish tracking a PDF generation
   */
  finishPdfGeneration(ticketNumber: string, serviceName?: string): void {
    const key = `${serviceName || ''}-${ticketNumber}`;
    this.activePdfGenerations.delete(key);
  }

  private ensureDirectoryExists(dir?: string): void {
    const targetDir = dir || this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`[PDF Storage] Created directory: ${targetDir}`);
    }
  }
}

export default PDFStorageManager;
