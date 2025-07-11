#!/usr/bin/env node
/**
 * 🎯 Build Single Screen Script
 * ينشئ شاشة واحدة فقط
 *
 * Usage: node scripts/build-single.js [screen-name]
 * Example: node scripts/build-single.js display
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Available screens configuration
const AVAILABLE_SCREENS = {
  display: {
    name: 'Display',
    mode: 'display',
    configFile: 'display.config.js',
    description: 'شاشة العرض مع الخادم المدمج'
  },
  customer: {
    name: 'Customer',
    mode: 'customer',
    configFile: 'customer.config.js',
    description: 'نظام العملاء لإنشاء التذاكر'
  },
  window: {
    name: 'Window',
    mode: 'window',
    configFile: 'window.config.js',
    description: 'محطة شباك الخدمة'
  },
  admin: {
    name: 'Admin',
    mode: 'admin',
    configFile: 'admin.config.js',
    description: 'لوحة الإدارة والتحكم'
  }
};

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARNING: '\x1b[33m',
    STEP: '\x1b[35m'
  };
  const reset = '\x1b[0m';
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
}

function showUsage() {
  console.log(`
🎯 CASNOS Single Screen Builder

Usage: node scripts/build-single.js [screen-name]

Available screens:
${Object.entries(AVAILABLE_SCREENS).map(([key, screen]) =>
  `  ${key.padEnd(10)} - ${screen.description}`
).join('\n')}

Examples:
  node scripts/build-single.js display   # Build Display screen with server
  node scripts/build-single.js customer  # Build Customer screen only
  node scripts/build-single.js window    # Build Window screen only
  node scripts/build-single.js admin     # Build Admin screen only
`);
}

async function buildSingleScreen(screenKey) {
  const screen = AVAILABLE_SCREENS[screenKey];

  if (!screen) {
    log(`❌ Unknown screen: ${screenKey}`, 'ERROR');
    log(`Available screens: ${Object.keys(AVAILABLE_SCREENS).join(', ')}`, 'INFO');
    return false;
  }

  try {
    log(`🎯 Building ${screen.name} Screen Only...`, 'STEP');
    log(`📝 Description: ${screen.description}`, 'INFO');

    const rootDir = process.cwd();
    const configPath = path.join(rootDir, 'build-configs', screen.configFile);

    // Verify config file exists
    if (!await fs.pathExists(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // Set environment variables
    const env = {
      ...process.env,
      SCREEN_MODE: screen.mode,
      NODE_ENV: 'production'
    };

    // Clean only this screen's output directory
    const distDir = path.join(rootDir, 'dist', screen.name);
    log(`🧹 Cleaning ${screen.name} build directory...`, 'INFO');
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Build the main application
    log(`📦 Building application...`, 'INFO');
    execSync('npm run build', { stdio: 'inherit', env });

    // Build the executable with custom config
    log(`🔧 Creating executable package...`, 'INFO');
    const builderCmd = `npx electron-builder --config "${configPath}"`;
    execSync(builderCmd, { stdio: 'inherit', env });

    // Create README file
    await createReadmeFile(screen, distDir);

    log(`✅ ${screen.name} screen built successfully!`, 'SUCCESS');
    log(`📁 Output location: dist/${screen.name}/`, 'INFO');

    if (screen.includeServer) {
      log(`🌐 This build includes the server - run this first!`, 'WARNING');
    } else {
      log(`🔗 This build requires Display screen to be running for server connection`, 'WARNING');
    }

    return true;

  } catch (error) {
    log(`❌ Failed to build ${screen.name}: ${error.message}`, 'ERROR');
    return false;
  }
}

async function createReadmeFile(screen, distPath) {
  const readmePath = path.join(distPath, 'README.md');

  const readmeContent = `# ${screen.name} Screen - CASNOS

## 📝 الوصف
${screen.description}

## 🖥️ معلومات التطبيق
- **نوع الشاشة:** ${screen.mode}
- **الخادم المدمج:** ${screen.includeServer ? 'نعم ✅' : 'لا ❌'}
- **تاريخ البناء:** ${new Date().toLocaleDateString('ar-SA')}

## 🚀 طريقة التشغيل

### المتطلبات
- Windows 10/11 (64-bit)
- ذاكرة وصول عشوائي: 4GB كحد أدنى
- مساحة فارغة: 500MB

### خطوات التشغيل
1. قم بتشغيل الملف التنفيذي
2. ${screen.includeServer
    ? 'سيبدأ الخادم تلقائياً مع التطبيق (قد يستغرق 5-10 ثوانٍ)'
    : 'تأكد من تشغيل CASNOS Display System أولاً (للخادم)'}
3. اتبع التعليمات على الشاشة

${screen.includeServer ? `
### 🌐 معلومات الخادم
- الخادم سيعمل على المنفذ: 3001
- عنوان IP سيتم عرضه في واجهة التطبيق
- أجهزة أخرى يمكنها الاتصال تلقائياً عبر UDP Discovery
` : `
### 🔗 متطلبات الشبكة
- يجب أن يكون جهاز Display Screen يعمل على نفس الشبكة
- سيتم البحث عن الخادم تلقائياً
- في حالة عدم العثور على الخادم، يمكن الإدخال اليدوي
`}

## 📞 الدعم الفني
للحصول على الدعم الفني، تواصل مع فريق التطوير.

---
**البناء الفردي:** تم بناء هذه الشاشة منفصلة
**النسخة:** 1.0.0
`;

  await fs.writeFile(readmePath, readmeContent, 'utf8');
  log(`📝 README created`, 'INFO');
}

// Main execution
async function main() {
  const screenArg = process.argv[2];

  if (!screenArg) {
    showUsage();
    process.exit(1);
  }

  if (screenArg === '--help' || screenArg === '-h') {
    showUsage();
    process.exit(0);
  }

  const success = await buildSingleScreen(screenArg.toLowerCase());
  process.exit(success ? 0 : 1);
}

// Cleanup handler
process.on('SIGINT', () => {
  log('\n⏹️ Build process interrupted', 'WARNING');
  process.exit(1);
});

if (require.main === module) {
  main();
}
