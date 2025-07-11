/**
 * 🔍 Find Production Monitor Log File
 * ابحث عن ملف مراقبة الإنتاج
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 البحث عن ملف production-monitor.txt');
console.log('=' .repeat(50));

// 1. مسارات محتملة للبحث
const possiblePaths = [
  // Development
  path.join(process.cwd(), 'production-monitor.txt'),

  // Production - مجلد التطبيق
  path.join(process.execPath, '..', 'production-monitor.txt'),
  path.join(path.dirname(process.execPath), 'production-monitor.txt'),

  // Production - مجلد resources
  path.join(process.resourcesPath || '', 'production-monitor.txt'),
  path.join(path.dirname(process.execPath), 'resources', 'production-monitor.txt'),

  // Windows - مجلد AppData
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

console.log('\n📁 مسارات البحث:');
console.log('- process.cwd():', process.cwd());
console.log('- process.execPath:', process.execPath);
console.log('- process.resourcesPath:', process.resourcesPath || 'undefined');
console.log('- __dirname:', __dirname);
console.log('- Home directory:', os.homedir());

console.log('\n🔍 البحث في المسارات المحتملة:');
const foundFiles = [];

possiblePaths.forEach((filePath, index) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const lastModified = stats.mtime.toLocaleString();
      const size = stats.size;

      console.log(`✅ ${index + 1}. FOUND: ${filePath}`);
      console.log(`   📏 Size: ${size} bytes`);
      console.log(`   📅 Last Modified: ${lastModified}`);

      foundFiles.push({
        path: filePath,
        size: size,
        lastModified: lastModified
      });
    } else {
      console.log(`❌ ${index + 1}. NOT FOUND: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. ERROR: ${filePath} - ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
if (foundFiles.length > 0) {
  console.log(`✅ تم العثور على ${foundFiles.length} ملف(ات):`)
  foundFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}`);
    console.log(`   📏 ${file.size} bytes | 📅 ${file.lastModified}`);
  });

  console.log('\n📖 لقراءة محتوى الملف:');
  console.log('- في Windows: notepad "path/to/production-monitor.txt"');
  console.log('- في Command Prompt: type "path/to/production-monitor.txt"');
  console.log('- في PowerShell: Get-Content "path/to/production-monitor.txt"');

} else {
  console.log('❌ لم يتم العثور على أي ملف production-monitor.txt');
  console.log('💡 الملف سيتم إنشاؤه عند تشغيل التطبيق في الإنتاج');
}

console.log('\n🎯 لتسهيل العثور على الملف، يمكنك:');
console.log('1. تشغيل التطبيق مرة واحدة');
console.log('2. تشغيل هذا الأمر مرة أخرى');
console.log('3. أو البحث في مجلد التطبيق المثبت');
