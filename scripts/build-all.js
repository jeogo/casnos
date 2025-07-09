#!/usr/bin/env node
/**
 * 🏗️ Enhanced Build All Screens Script
 * ينشئ جميع الشاشات كملفات تنفيذية منفصلة مع تكوينات مخصصة
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const SCREENS = [
  {
    name: 'Display',
    mode: 'display',
    configFile: 'display.config.js',
    description: 'شاشة العرض مع الخادم المدمج',
    includeServer: true,
    priority: 1 // Build first (contains server)
  },
  {
    name: 'Customer',
    mode: 'customer',
    configFile: 'customer.config.js', 
    description: 'نظام العملاء لإنشاء التذاكر',
    includeServer: false,
    priority: 2
  },
  {
    name: 'Window',
    mode: 'window',
    configFile: 'window.config.js',
    description: 'محطة شباك الخدمة',
    includeServer: false,
    priority: 3
  },
  {
    name: 'Admin',
    mode: 'admin',
    configFile: 'admin.config.js',
    description: 'لوحة الإدارة والتحكم',
    includeServer: false,
    priority: 4
  }
];

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

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

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command}`, 'INFO');
    
    try {
      execSync(command, {
        stdio: 'inherit',
        ...options
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function buildScreen(screen) {
  try {
    log(`🏗️ Building ${screen.name} Screen (${screen.description})...`, 'STEP');
    
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

    // Build the main application
    log(`� Building application for ${screen.name}...`, 'INFO');
    await runCommand('npm run build', { env });
    
    // Build server if needed
    if (screen.includeServer) {
      log(`🌐 Building server for ${screen.name}...`, 'INFO');
      await runCommand('npm run build:server', { env });
    }

    // Build the executable with custom config
    log(`🔧 Creating executable for ${screen.name}...`, 'INFO');
    const builderCmd = `electron-builder --config "${configPath}"`;
    await runCommand(builderCmd, { env });
    
    // Create README file
    await createReadmeFile(screen);
    
    log(`✅ ${screen.name} built successfully!`, 'SUCCESS');
    
  } catch (error) {
    log(`❌ Failed to build ${screen.name}: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function createReadmeFile(screen) {
  const distPath = path.join(distDir, screen.name);
  const readmePath = path.join(distPath, 'README.md');
  
  const readmeContent = `# ${screen.name} Screen - CASNOS

## 📝 الوصف
${screen.description}

## 🖥️ معلومات التطبيق
- **نوع الشاشة:** ${screen.mode}
- **الخادم المدمج:** ${screen.includeServer ? 'نعم ✅' : 'لا ❌'}
- **الإصدار:** 1.0.0

## �🚀 طريقة التشغيل

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
### 🌐 معلومات الخادم (Display Screen فقط)
- الخادم سيعمل على المنفذ: 3001
- عنوان IP سيتم عرضه في واجهة التطبيق
- أجهزة أخرى يمكنها الاتصال تلقائياً عبر UDP Discovery
` : `
### 🔗 متطلبات الشبكة
- يجب أن يكون جهاز Display Screen يعمل على نفس الشبكة
- سيتم البحث عن الخادم تلقائياً
- في حالة عدم العثور على الخادم، يمكن الإدخال اليدوي
`}

## 🛠️ استكشاف الأخطاء

### مشاكل شائعة
- **لا يمكن العثور على الخادم:** تأكد من تشغيل Display Screen أولاً
- **مشاكل الطباعة:** تحقق من إعدادات الطابعة في النظام
- **مشاكل الصوت:** تحقق من إعدادات الصوت في Windows

### ملفات السجلات
- موقع ملفات السجلات: \`%APPDATA%\\CASNOS\\logs\`
- ملف الإعدادات: \`%APPDATA%\\CASNOS\\config.json\`

## 📞 الدعم الفني
للحصول على الدعم الفني، تواصل مع فريق التطوير.

---
**تم الإنشاء:** ${new Date().toLocaleDateString('ar-SA')}  
**البناء التلقائي:** CASNOS Build System v1.0
`;

  await fs.writeFile(readmePath, readmeContent, 'utf8');
  log(`📝 README created for ${screen.name}`, 'INFO');
}

async function createMasterReadme() {
  const masterReadmePath = path.join(distDir, 'README.md');
  
  const content = `# 🎯 CASNOS - نظام إدارة طوابير الانتظار

## 📁 ملفات التوزيع

تم إنشاء 4 تطبيقات منفصلة، كل واحد في مجلد منفصل:

${SCREENS.map(screen => `
### 📺 ${screen.name}/
- **الوصف:** ${screen.description}
- **الملف التنفيذي:** \`${screen.name}/CASNOS ${screen.name}*.exe\`
- **الخادم المدمج:** ${screen.includeServer ? '✅ نعم' : '❌ لا'}
- **ترتيب التشغيل:** ${screen.priority}
`).join('')}

## 🚀 ترتيب التشغيل الموصى به

1. **أولاً:** Display Screen (يحتوي على الخادم)
2. **ثانياً:** Customer Screen (لإنشاء التذاكر)
3. **ثالثاً:** Window Screens (للموظفين)
4. **أخيراً:** Admin Screen (للإدارة)

## 🌐 متطلبات الشبكة

- جميع الأجهزة يجب أن تكون على نفس الشبكة المحلية
- Display Screen يعمل كخادم مركزي
- باقي التطبيقات تتصل بـ Display Screen تلقائياً

## 📋 ملاحظات مهمة

- لا تقم بتشغيل أكثر من Display Screen واحد على نفس الشبكة
- يمكن تشغيل عدة Customer/Window/Admin screens حسب الحاجة
- كل تطبيق له ملف README منفصل بالتفاصيل

---
**تاريخ البناء:** ${new Date().toLocaleDateString('ar-SA')}  
**الإصدار:** 1.0.0
`;

  await fs.writeFile(masterReadmePath, content, 'utf8');
  log('📚 Master README created', 'SUCCESS');
}

async function buildAllScreens() {
  try {
    log('🚀 Starting CASNOS Multi-Screen Build Process...', 'STEP');
    
    // Clean dist directory
    log('🧹 Cleaning previous builds...', 'INFO');
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Sort screens by priority (Display first)
    const sortedScreens = SCREENS.sort((a, b) => a.priority - b.priority);
    
    // Build each screen
    for (const screen of sortedScreens) {
      await buildScreen(screen);
    }
    
    // Create master README
    await createMasterReadme();
    
    // Display final summary
    log('🎉 All screens built successfully!', 'SUCCESS');
    log('📁 Build output structure:', 'INFO');
    
    SCREENS.forEach(screen => {
      log(`   📂 dist/${screen.name}/ - ${screen.description}`, 'INFO');
      if (screen.includeServer) {
        log(`      └── 🌐 Server included`, 'INFO');
      }
    });
    
    log('\n📋 Next Steps:', 'STEP');
    log('1. Test Display Screen first (contains server)', 'INFO');
    log('2. Test other screens on same network', 'INFO');
    log('3. Deploy to target machines', 'INFO');
    
  } catch (error) {
    log(`💥 Build process failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Add cleanup handler
process.on('SIGINT', () => {
  log('\n⏹️ Build process interrupted', 'WARNING');
  process.exit(1);
});

// Run the build process
if (require.main === module) {
  buildAllScreens();
}
