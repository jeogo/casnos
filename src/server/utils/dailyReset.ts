import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/connection';
// logger removed

/**
 * نظام الإعادة اليومية التلقائية - Daily Reset System
 * ======================================================
 *
 * هذا النظام يقوم بإعادة تعيين العدادات والبيانات المؤقتة بشكل يومي تلقائي
 * This system automatically resets counters and temporary data daily
 *
 * الميزات الرئيسية / Main Features:
 * - إعادة تعيين أرقام التذاكر لتبدأ من 1 كل يوم / Reset ticket numbers to start from 1 each day
 * - مسح ملفات PDF المؤقتة / Clear temporary PDF files
 * - تنظيف الكاش وتحسين الأداء / Clean cache and optimize performance
 * - جدولة تلقائية في وقت محدد (افتراضي: منتصف الليل) / Automatic scheduling at specified time (default: midnight)
 * - تتبع آخر إعادة تعيين لتجنب التكرار / Track last reset to avoid duplication
 * - إمكانية فرض إعادة فورية للإدارة / Force immediate reset capability for admin
 *
 * كيف يعمل / How it works:
 * 1. عند بدء تشغيل الخادم، يتحقق النظام من آخر إعادة تعيين
 * 2. إذا لم تتم إعادة التعيين اليوم، يقوم بتنفيذها فوراً
 * 3. يجدول النظام إعادة التعيين التالية تلقائياً
 * 4. يتحقق النظام كل ساعة للتأكد من عدم فوات موعد الإعادة
 *
 * الإعدادات القابلة للتخصيص / Configurable Settings:
 * - تمكين/تعطيل النظام / Enable/disable system
 * - وقت الإعادة اليومية / Daily reset time
 * - مكونات الإعادة (تذاكر، PDF، كاش) / Reset components (tickets, PDFs, cache)
 * - مدة الاحتفاظ بالبيانات / Data retention period
 */

interface DailyResetConfig {
  enabled: boolean;
  resetPDFs: boolean;
  resetTickets: boolean;
  resetCache: boolean;
  keepDays: number; // عدد الأيام للاحتفاظ بالبيانات
  resetTime: string; // وقت الإعادة التلقائية (HH:MM format)
}

interface DailyResetRecord {
  id?: number;
  last_reset_date: string; // YYYY-MM-DD format
  last_reset_timestamp: string; // ISO timestamp
  tickets_reset: boolean;
  pdfs_reset: boolean;
  cache_reset: boolean;
}

class DailyResetManager {
  private config: DailyResetConfig;
  private resetInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: true,
      resetPDFs: true,
      resetTickets: true,
      resetCache: true,
      keepDays: 30,
      resetTime: '00:00' // منتصف الليل
    };

    // بدء جدولة الإعادة التلقائية
    this.scheduleAutomaticReset();
  }

  // تنفيذ المسح الكامل عند التشغيل (بدون أي تحقق من التاريخ)
  public async performResetOnStartup(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // logger removed
    const startTime = Date.now();

    try {
      // التحقق من ضرورة الإعادة اليومية
      const needsReset = await this.needsDailyReset();

      if (!needsReset) {
        // logger removed
        return;
      }

      // logger removed

      // 1. إعادة تعيين أرقام التذاكر
      if (this.config.resetTickets) {
        await this.resetTicketNumbers();
      }

      // 2. مسح ملفات PDF
      if (this.config.resetPDFs) {
        await this.cleanupPDFFiles();
      }

      // 3. مسح جميع أنواع الكاش
      if (this.config.resetCache) {
        await this.clearAllCache();
      }

      // 4. تنظيف البيانات القديمة
      await this.cleanupOldData();

      // 5. تحسين قاعدة البيانات
      await this.optimizeDatabase();

      // 6. تسجيل عملية الإعادة في قاعدة البيانات
      await this.recordDailyReset();

      const duration = Date.now() - startTime;
      // logger removed

      // إشعار جميع العملاء المتصلين بالمسح
      this.notifyClientsOfReset();

    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // إعادة تعيين أرقام التذاكر لتبدأ من 1
  private async resetTicketNumbers(): Promise<void> {
    try {
      // logger removed

      const db = getDatabase();

      // حذف جميع التذاكر
      await db.prepare('DELETE FROM tickets').run();

      // إعادة تعيين عداد التذاكر في قاعدة البيانات
      await db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'tickets'`).run();

      // إعادة تعيين أي جداول تحتوي على عدادات تذاكر (بحماية من عدم وجود العمود)
      try {
        await db.prepare(`
          UPDATE services
          SET last_ticket_number = 0
          WHERE last_ticket_number IS NOT NULL
        `).run();
      } catch (err) {
        // العمود قد لا يكون موجوداً في الجدول - هذا عادي
        // logger removed
      }

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // مسح جميع ملفات PDF المولدة
  private async cleanupPDFFiles(): Promise<void> {
    try {
      // logger removed

      // مجلدات PDF المحتملة
      const pdfDirectories = [
        'resources/tickets',
        'temp/pdf',
        'temp',
        'public/pdfs',
        'storage/pdfs',
        'data/pdfs',
        'generated/pdfs',
        'output/tickets'
      ];

      let totalDeleted = 0;

      for (const dir of pdfDirectories) {
        const fullPath = path.resolve(dir);

        if (fs.existsSync(fullPath)) {
          const deleted = await this.cleanDirectory(fullPath, '.pdf');
          totalDeleted += deleted;
        }
      }

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // مسح جميع أنواع الكاش
  private async clearAllCache(): Promise<void> {
    try {
      // logger removed

      // 1. مسح كاش قاعدة البيانات
      await this.clearDatabaseCache();

      // 2. مسح مجلدات الكاش من النظام
      const cacheDirectories = [
        'cache',
        '.cache',
        'temp/cache',
        'storage/cache',
        'data/cache',
        'node_modules/.cache',
        'public/cache',
        'temp'
      ];

      let totalDeleted = 0;

      for (const dir of cacheDirectories) {
        const fullPath = path.resolve(dir);

        if (fs.existsSync(fullPath)) {
          const deleted = await this.cleanDirectory(fullPath);
          totalDeleted += deleted;
        }
      }

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // مسح كاش قاعدة البيانات
  private async clearDatabaseCache(): Promise<void> {
    try {
      // logger removed

      const db = getDatabase();

      // مسح جداول الكاش إن وجدت
      const cacheTables = [
        'cache_statistics',
        'cache_queue_status',
        'temp_calculations',
        'session_cache',
        'temp_data'
      ];

      for (const table of cacheTables) {
        try {
          await db.prepare(`DELETE FROM ${table}`).run();
          // logger removed
        } catch (err) {
          // الجدول قد لا يكون موجوداً
          // logger removed
        }
      }

      // مسح الجلسات المنتهية والبيانات المؤقتة
      try {
        await db.prepare(`
          DELETE FROM device_sessions
          WHERE last_heartbeat < datetime('now', '-1 hour')
        `).run();
      } catch (err) {
        // logger removed
      }

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // تنظيف البيانات القديمة
  private async cleanupOldData(): Promise<void> {
    try {
      // logger removed

      const db = getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.keepDays);

      // حذف السجلات القديمة
      const oldDataQueries = [
        `DELETE FROM device_logs WHERE created_at < '${cutoffDate.toISOString()}'`,
        `DELETE FROM error_logs WHERE created_at < '${cutoffDate.toISOString()}'`,
        `DELETE FROM audit_trail WHERE created_at < '${cutoffDate.toISOString()}'`,
        `DELETE FROM print_history WHERE created_at < '${cutoffDate.toISOString()}'`
      ];

      for (const query of oldDataQueries) {
        try {
          const result = await db.prepare(query).run();
        } catch (err) {
          // Error executing cleanup query
        }
      }

      // تنظيف ملفات السجلات القديمة
      await this.cleanupLogFiles();

    } catch (error) {
      throw error;
    }
  }

  // تحسين قاعدة البيانات
  private async optimizeDatabase(): Promise<void> {
    try {
      // logger removed

      const db = getDatabase();

      // تنفيذ VACUUM لتحسين قاعدة البيانات
      await db.prepare('VACUUM').run();

      // إعادة تحليل الجداول لتحسين الاستعلامات
      await db.prepare('ANALYZE').run();

      // إعادة فهرسة الجداول المهمة
      const reindexQueries = [
        'REINDEX tickets',
        'REINDEX services',
        'REINDEX devices'
      ];

      for (const query of reindexQueries) {
        try {
          await db.prepare(query).run();
        } catch (err) {
          // logger removed
        }
      }

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // تنظيف ملفات السجلات القديمة
  private async cleanupLogFiles(): Promise<void> {
    try {
      const logsDirectory = path.resolve('logs');

      if (fs.existsSync(logsDirectory)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.keepDays);

        const files = fs.readdirSync(logsDirectory);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = path.join(logsDirectory, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }

      }
    } catch (error) {
      // Error during log cleanup
    }
  }

  // مساعد لتنظيف مجلد بشكل تكراري
  private async cleanDirectory(dirPath: string, extension?: string): Promise<number> {
    let deletedCount = 0;

    try {
      if (!fs.existsSync(dirPath)) {
        return deletedCount;
      }

      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          if (!extension || file.endsWith(extension)) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } else if (stats.isDirectory()) {
          // تنظيف المجلدات الفرعية بشكل تكراري
          deletedCount += await this.cleanDirectory(filePath, extension);

          // حذف المجلد إذا كان فارغاً
          try {
            fs.rmdirSync(filePath);
          } catch (err) {
            // المجلد ليس فارغاً أو لا يمكن حذفه
          }
        }
      }
    } catch (error) {
      // logger removed
    }

    return deletedCount;
  }

  // إشعار العملاء بالمسح
  private notifyClientsOfReset(): void {
    try {
      // سيتم ربطه مع socketHandlers لإشعار جميع العملاء
      const { getSocketIO } = require('./socketInstance');
      const { broadcastSystemReset } = require('../sockets/socketHandlers');

      const io = getSocketIO();
      if (io) {
        broadcastSystemReset(io);
        // logger removed
      } else {
        // logger removed
      }
    } catch (error) {
      // logger removed
    }
  }

  // مسح فوري يدوي
  public async performManualReset(): Promise<void> {
    // logger removed
    await this.forceImmediateReset();
  }

  // تحديث إعدادات المسح
  public updateConfig(newConfig: Partial<DailyResetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // logger removed
  }

  // الحصول على حالة المسح
  public getResetStatus(): { config: DailyResetConfig; enabled: boolean } {
    return {
      config: this.config,
      enabled: this.config.enabled
    };
  }

  // تهيئة جدول تتبع الإعادات اليومية
  private async initializeDailyResetTable(): Promise<void> {
    try {
      const db = getDatabase();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS daily_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          last_reset_date TEXT NOT NULL UNIQUE,
          last_reset_timestamp TEXT NOT NULL,
          tickets_reset INTEGER DEFAULT 0,
          pdfs_reset INTEGER DEFAULT 0,
          cache_reset INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // التحقق من ضرورة الإعادة اليومية
  private async needsDailyReset(): Promise<boolean> {
    try {
      await this.initializeDailyResetTable();

      const db = getDatabase();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const lastReset = db.prepare(`
        SELECT * FROM daily_resets
        WHERE last_reset_date = ?
        ORDER BY id DESC
        LIMIT 1
      `).get(today) as DailyResetRecord | undefined;

      // إذا لم تحدث إعادة اليوم، فنحتاج إعادة
      if (!lastReset) {
        // logger removed
        return true;
      }

      // logger removed
      return false;
    } catch (error) {
      // logger removed
      // في حالة الخطأ، نقوم بالإعادة للأمان
      return true;
    }
  }

  // تسجيل عملية الإعادة اليومية
  private async recordDailyReset(): Promise<void> {
    try {
      const db = getDatabase();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const timestamp = new Date().toISOString();

      // حذف أي سجل موجود لليوم الحالي
      await db.prepare(`DELETE FROM daily_resets WHERE last_reset_date = ?`).run(today);

      // إدراج سجل جديد
      await db.prepare(`
        INSERT INTO daily_resets (
          last_reset_date,
          last_reset_timestamp,
          tickets_reset,
          pdfs_reset,
          cache_reset
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        today,
        timestamp,
        this.config.resetTickets ? 1 : 0,
        this.config.resetPDFs ? 1 : 0,
        this.config.resetCache ? 1 : 0
      );

      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // جدولة الإعادة التلقائية
  private scheduleAutomaticReset(): void {
    if (!this.config.enabled) {
      return;
    }

    // إلغاء الجدولة السابقة إن وجدت
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }

    // حساب الوقت حتى الإعادة التالية
    const scheduleNextReset = () => {
      const now = new Date();

      // Parse reset time safely with destructuring and defaults
      const resetTimeParts = this.config.resetTime.split(':');
      const [resetHoursStr = '0', resetMinutesStr = '0'] = resetTimeParts;
      const resetHours = parseInt(resetHoursStr, 10) || 0;
      const resetMinutes = parseInt(resetMinutesStr, 10) || 0;

      const nextReset = new Date();
      nextReset.setHours(resetHours, resetMinutes, 0, 0);

      // إذا كان الوقت المحدد قد مر اليوم، جدوله للغد
      if (nextReset <= now) {
        nextReset.setDate(nextReset.getDate() + 1);
      }

      const timeUntilReset = nextReset.getTime() - now.getTime();

      // logger removed

      setTimeout(async () => {
        try {
          await this.performAutomaticDailyReset();
        } catch (error) {
          // logger removed
        }

        // جدولة الإعادة التالية
        scheduleNextReset();
      }, timeUntilReset);
    };

    scheduleNextReset();

    // فحص إضافي كل ساعة للتأكد من عدم فوات موعد الإعادة
    this.resetInterval = setInterval(async () => {
      try {
        const needsReset = await this.needsDailyReset();
        if (needsReset) {
          // logger removed
          await this.performAutomaticDailyReset();
        }
      } catch (error) {
        // logger removed
      }
    }, 60 * 60 * 1000); // كل ساعة
  }

  // تنفيذ الإعادة التلقائية اليومية
  private async performAutomaticDailyReset(): Promise<void> {
    try {
      // logger removed
      await this.performResetOnStartup();
      // logger removed
    } catch (error) {
      // logger removed
      throw error;
    }
  }

  // الحصول على معلومات آخر إعادة
  public async getLastResetInfo(): Promise<DailyResetRecord | null> {
    try {
      await this.initializeDailyResetTable();

      const db = getDatabase();
      const lastReset = db.prepare(`
        SELECT * FROM daily_resets
        ORDER BY id DESC
        LIMIT 1
      `).get() as DailyResetRecord | undefined;

      return lastReset || null;
    } catch (error) {
      // logger removed
      return null;
    }
  }

  // فرض إعادة فورية (للاستخدام الإداري)
  public async forceImmediateReset(): Promise<void> {
    // logger removed

    // إزالة سجل اليوم الحالي لفرض الإعادة
    try {
      const db = getDatabase();
      const today = new Date().toISOString().split('T')[0];
      await db.prepare(`DELETE FROM daily_resets WHERE last_reset_date = ?`).run(today);
    } catch (error) {
      // logger removed
    }

    // تنفيذ الإعادة
    await this.performResetOnStartup();
  }
}

// تصدير مثيل واحد
export const dailyResetManager = new DailyResetManager();
export default dailyResetManager;
