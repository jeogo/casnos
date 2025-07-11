// تشخيص التطبيق المستقل - Production Standalone Diagnostics
const path = require('path');
const fs = require('fs');

console.log('🔍 CASNOS Production Standalone Diagnostics');
console.log('='.repeat(50));

// 1. معلومات البيئة
console.log('\n📋 Environment Information:');
console.log('- Node.js version:', process.version);
console.log('- Platform:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Process title:', process.title);
console.log('- Executable path:', process.execPath);

// 2. مسارات التطبيق
console.log('\n📁 Application Paths:');
console.log('- Current working directory:', process.cwd());
console.log('- Resources path:', process.resourcesPath || 'Not available');
console.log('- App path:', process.env.PORTABLE_EXECUTABLE_DIR || 'Not available');

// 3. فحص الملفات المطلوبة
console.log('\n🔍 Required Files Check:');

const requiredFiles = [
  'resources/assets/SumatraPDF.exe',
  'resources/assets/SumatraPDF-settings.txt',
  'resources/video/video-config.json',
  'resources/voice'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(process.resourcesPath || process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  console.log(`- ${file}: ${exists ? '✅ Found' : '❌ Missing'}`);
  if (exists) {
    try {
      const stats = fs.statSync(fullPath);
      console.log(`  Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
    } catch (e) {
      console.log(`  Error reading stats: ${e.message}`);
    }
  }
});

// 4. فحص Native Modules
console.log('\n🔧 Native Modules Check:');
const nativeModules = ['better-sqlite3', 'sqlite3'];

nativeModules.forEach(module => {
  try {
    const moduleInfo = require(module);
    console.log(`- ${module}: ✅ Loaded successfully`);

    // اختبار خاص لـ better-sqlite3
    if (module === 'better-sqlite3') {
      try {
        const Database = require('better-sqlite3');
        const db = new Database(':memory:');
        db.exec('CREATE TABLE test (id INTEGER)');
        db.exec('INSERT INTO test (id) VALUES (1)');
        const result = db.prepare('SELECT COUNT(*) as count FROM test').get();
        console.log(`  Database test: ✅ Success (${result.count} record)`);
        db.close();
      } catch (e) {
        console.log(`  Database test: ❌ Failed - ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`- ${module}: ❌ Failed to load - ${e.message}`);
  }
});

// 5. فحص Puppeteer
console.log('\n🌐 Puppeteer Check:');
try {
  const puppeteer = require('puppeteer');
  console.log('- Puppeteer: ✅ Loaded successfully');

  const chromiumPath = puppeteer.executablePath();
  console.log(`- Chromium path: ${chromiumPath}`);
  console.log(`- Chromium exists: ${fs.existsSync(chromiumPath) ? '✅ Yes' : '❌ No'}`);

  // محاولة تشغيل Puppeteer
  (async () => {
    try {
      console.log('- Testing Puppeteer launch...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test</h1></body></html>');

      console.log('- Puppeteer test: ✅ Success');
      await browser.close();
    } catch (e) {
      console.log(`- Puppeteer test: ❌ Failed - ${e.message}`);
    }
  })();

} catch (e) {
  console.log(`- Puppeteer: ❌ Failed to load - ${e.message}`);
}

// 6. فحص المجلدات
console.log('\n📂 Directory Structure:');
const checkDirs = [
  'resources',
  'resources/assets',
  'resources/video',
  'resources/voice',
  'resources/fonts'
];

checkDirs.forEach(dir => {
  const fullPath = path.join(process.resourcesPath || process.cwd(), dir);
  const exists = fs.existsSync(fullPath);
  console.log(`- ${dir}: ${exists ? '✅ Found' : '❌ Missing'}`);

  if (exists) {
    try {
      const files = fs.readdirSync(fullPath);
      console.log(`  Files: ${files.length} items`);
      if (files.length > 0 && files.length <= 5) {
        console.log(`  Contents: ${files.join(', ')}`);
      }
    } catch (e) {
      console.log(`  Error reading directory: ${e.message}`);
    }
  }
});

// 7. اختبار PDF Generation
console.log('\n📄 PDF Generation Test:');
try {
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Test PDF</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .ticket { border: 1px solid #000; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <h1>Test Ticket</h1>
        <p>رقم التذكرة: ${Date.now()}</p>
        <p>التاريخ: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  console.log('- HTML template: ✅ Ready');
  console.log('- Test HTML length:', testHTML.length);

} catch (e) {
  console.log(`- PDF test setup: ❌ Failed - ${e.message}`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Diagnostics completed!');
console.log('📋 Summary: Check the results above for any missing components.');
