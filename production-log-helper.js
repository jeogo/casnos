/**
 * 📊 Production Monitor Logger Helper
 * مساعد للوصول المباشر لملف المراقبة
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ProductionLogFinder {
  static getLogPath() {
    // محاكاة منطق ProductionMonitor
    const isDev = process.env.NODE_ENV === 'development' || !process.env.ELECTRON_IS_PACKAGED;

    if (isDev) {
      return path.join(process.cwd(), 'production-monitor.txt');
    } else {
      // Production: save to app data or executable directory
      const baseDir = process.resourcesPath || path.dirname(process.execPath);
      return path.join(baseDir, 'production-monitor.txt');
    }
  }

  static findAllLogFiles() {
    const searchPaths = [
      // Development
      path.join(process.cwd(), 'production-monitor.txt'),

      // Production paths
      path.join(path.dirname(process.execPath), 'production-monitor.txt'),
      path.join(process.resourcesPath || '', 'production-monitor.txt'),

      // Windows installation paths
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'CASNOS-Display', 'production-monitor.txt'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'CASNOS-Customer', 'production-monitor.txt'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'CASNOS-Window', 'production-monitor.txt'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'CASNOS-Admin', 'production-monitor.txt'),

      // Build directories
      path.join(process.cwd(), 'dist', 'Display', 'win-unpacked', 'production-monitor.txt'),
      path.join(process.cwd(), 'dist', 'Customer', 'win-unpacked', 'production-monitor.txt'),
      path.join(process.cwd(), 'dist', 'Window', 'win-unpacked', 'production-monitor.txt'),
      path.join(process.cwd(), 'dist', 'Admin', 'win-unpacked', 'production-monitor.txt')
    ];

    return searchPaths.filter(p => fs.existsSync(p));
  }

  static readLogFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error('خطأ في قراءة ملف السجل:', error.message);
      return null;
    }
  }

  static watchLogFile(filePath, callback) {
    if (!fs.existsSync(filePath)) {
      console.log('⚠️  ملف السجل غير موجود بعد، سيتم مراقبته عند إنشاؤه');
      return;
    }

    const watcher = fs.watchFile(filePath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        callback(filePath);
      }
    });

    console.log(`👀 مراقبة ملف السجل: ${filePath}`);
    return watcher;
  }

  static getLogStats(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        lines: lines.length,
        entries: lines.filter(line => line.includes('[')).length
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = ProductionLogFinder;

// إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  console.log('🔍 البحث عن ملفات سجل المراقبة...');

  const expectedPath = ProductionLogFinder.getLogPath();
  console.log('📁 المسار المتوقع:', expectedPath);

  const foundFiles = ProductionLogFinder.findAllLogFiles();

  if (foundFiles.length > 0) {
    console.log(`✅ تم العثور على ${foundFiles.length} ملف(ات):`);

    foundFiles.forEach((file, index) => {
      console.log(`\n${index + 1}. ${file}`);

      const stats = ProductionLogFinder.getLogStats(file);
      if (stats) {
        console.log(`   📏 Size: ${stats.size} bytes`);
        console.log(`   📅 Created: ${stats.created.toLocaleString()}`);
        console.log(`   📅 Modified: ${stats.modified.toLocaleString()}`);
        console.log(`   📄 Lines: ${stats.lines}`);
        console.log(`   📊 Log Entries: ${stats.entries}`);
      }
    });

    // عرض محتوى آخر ملف
    if (foundFiles.length > 0) {
      console.log('\n📖 محتوى آخر ملف سجل:');
      console.log('=' .repeat(50));

      const latestFile = foundFiles[foundFiles.length - 1];
      const content = ProductionLogFinder.readLogFile(latestFile);

      if (content) {
        const lines = content.split('\n').filter(line => line.trim());
        const lastLines = lines.slice(-10); // آخر 10 سطور

        lastLines.forEach(line => {
          console.log(line);
        });
      }
    }

  } else {
    console.log('❌ لم يتم العثور على أي ملف سجل');
    console.log('💡 تأكد من تشغيل التطبيق في الإنتاج أولاً');
  }
}
