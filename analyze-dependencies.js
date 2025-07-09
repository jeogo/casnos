#!/usr/bin/env node

/**
 * 🔍 CASNOS Dependencies Usage Analyzer
 * تحليل استخدام المكتبات في مشروع CASNOS
 *
 * This script analyzes all files in the project to determine:
 * 1. Which dependencies are actually being used
 * 2. Which dependencies are NOT being used (potential cleanup)
 * 3. Where each dependency is being used
 * 4. Detailed usage statistics
 */

const fs = require('fs');
const path = require('path');

// قائمة جميع المكتبات من package.json
const DEPENDENCIES = {
  // Production Dependencies
  "@electron-toolkit/preload": "^3.0.1",
  "@electron-toolkit/utils": "^4.0.0",
  "@floating-ui/dom": "^1.7.2",
  "@floating-ui/react": "^0.27.13",
  "@headlessui/react": "^2.2.4",
  "@react-spring/web": "^10.0.1",
  "@types/react-transition-group": "^4.4.12",
  "@use-gesture/react": "^10.3.1",
  "address": "^2.0.3",
  "axios": "^1.10.0",
  "better-sqlite3": "^11.10.0",
  "clsx": "^2.1.1",
  "compression": "^1.8.0",
  "cors": "^2.8.5",
  "dayjs": "^1.11.13",
  "dotenv": "^16.5.0",
  "express": "^5.1.0",
  "express-rate-limit": "^7.5.0",
  "framer-motion": "^12.23.0",
  "fs-extra": "^11.3.0",
  "helmet": "^8.1.0",
  "ip": "^2.0.1",
  "joi": "^17.13.3",
  "lottie-react": "^2.4.1",
  "lucide-react": "^0.525.0",
  "moment": "^2.30.1",
  "network": "^0.7.0",
  "node-cron": "^4.1.0",
  "puppeteer": "^24.10.2",
  "react-intersection-observer": "^9.16.0",
  "react-spring": "^10.0.1",
  "react-transition-group": "^4.4.5",
  "react-use-gesture": "^9.1.3",
  "socket.io": "^4.8.1",
  "socket.io-client": "^4.8.1",
  "sqlite3": "^5.1.7",
  "tailwind-merge": "^3.3.1",
  "uuid": "^11.1.0",
  "ws": "^8.18.2"
};

const DEV_DEPENDENCIES = {
  "@electron-toolkit/tsconfig": "^1.0.1",
  "@types/better-sqlite3": "^7.6.13",
  "@types/compression": "^1.7.5",
  "@types/cors": "^2.8.17",
  "@types/express": "^5.0.3",
  "@types/ip": "^1.1.3",
  "@types/node": "^22.14.1",
  "@types/react": "^19.1.1",
  "@types/react-dom": "^19.1.2",
  "@types/ws": "^8.5.13",
  "@vitejs/plugin-react": "^4.3.4",
  "autoprefixer": "^10.4.21",
  "concurrently": "^9.2.0",
  "cross-env": "^7.0.3",
  "electron": "^35.1.5",
  "electron-builder": "^25.1.8",
  "electron-vite": "^3.1.0",
  "nodemon": "^3.1.9",
  "postcss": "^8.5.6",
  "prettier": "^3.5.3",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "tailwindcss": "^3.4.17",
  "ts-node": "^10.9.2",
  "typescript": "^5.8.3",
  "vite": "^6.2.6",
  "wait-on": "^8.0.3"
};

// معلومات الاستخدام
const usageInfo = {};
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml'];

// دوال التحليل
function initializeUsageInfo() {
  // تهيئة معلومات الاستخدام
  Object.keys(DEPENDENCIES).forEach(dep => {
    usageInfo[dep] = {
      type: 'production',
      version: DEPENDENCIES[dep],
      used: false,
      files: [],
      imports: []
    };
  });

  Object.keys(DEV_DEPENDENCIES).forEach(dep => {
    usageInfo[dep] = {
      type: 'development',
      version: DEV_DEPENDENCIES[dep],
      used: false,
      files: [],
      imports: []
    };
  });
}

function getAllFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // تجاهل مجلدات معينة
      if (!['node_modules', '.git', 'dist', 'out', 'build'].includes(file)) {
        getAllFiles(filePath, filesList);
      }
    } else {
      // التحقق من امتداد الملف
      if (fileExtensions.includes(path.extname(file))) {
        filesList.push(filePath);
      }
    }
  });

  return filesList;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.relative(process.cwd(), filePath);

    // البحث عن كل مكتبة في محتوى الملف
    Object.keys(usageInfo).forEach(dep => {
      const patterns = [
        // import patterns
        new RegExp(`import.*from\\s+['"\`]${dep.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]`, 'g'),
        new RegExp(`import\\s+['"\`]${dep.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]`, 'g'),
        // require patterns
        new RegExp(`require\\s*\\(\\s*['"\`]${dep.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]\\s*\\)`, 'g'),
        // dynamic import
        new RegExp(`import\\s*\\(\\s*['"\`]${dep.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]\\s*\\)`, 'g'),
        // package references in config files
        new RegExp(`['"\`]${dep.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"\`]`, 'g')
      ];

      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          usageInfo[dep].used = true;
          if (!usageInfo[dep].files.includes(fileName)) {
            usageInfo[dep].files.push(fileName);
          }
          matches.forEach(match => {
            if (!usageInfo[dep].imports.includes(match.trim())) {
              usageInfo[dep].imports.push(match.trim());
            }
          });
        }
      });
    });

  } catch (error) {
    console.error(`خطأ في تحليل الملف ${filePath}:`, error.message);
  }
}

function generateReport() {
  console.log('\\n🔍 تقرير تحليل استخدام المكتبات في CASNOS\\n');
  console.log('='.repeat(80));

  // الإحصائيات العامة
  const usedDeps = Object.values(usageInfo).filter(dep => dep.used);
  const unusedDeps = Object.values(usageInfo).filter(dep => !dep.used);
  const prodUsed = usedDeps.filter(dep => dep.type === 'production');
  const devUsed = usedDeps.filter(dep => dep.type === 'development');

  console.log(`\\n📊 الإحصائيات العامة:`);
  console.log(`   إجمالي المكتبات: ${Object.keys(usageInfo).length}`);
  console.log(`   المكتبات المستخدمة: ${usedDeps.length}`);
  console.log(`   المكتبات غير المستخدمة: ${unusedDeps.length}`);
  console.log(`   مكتبات الإنتاج المستخدمة: ${prodUsed.length}/${Object.keys(DEPENDENCIES).length}`);
  console.log(`   مكتبات التطوير المستخدمة: ${devUsed.length}/${Object.keys(DEV_DEPENDENCIES).length}`);

  // المكتبات المستخدمة
  console.log(`\\n✅ المكتبات المستخدمة (${usedDeps.length}):`);
  console.log('-'.repeat(50));

  const sortedUsed = usedDeps.sort((a, b) => b.files.length - a.files.length);
  sortedUsed.forEach((dep, index) => {
    const depName = Object.keys(usageInfo).find(key => usageInfo[key] === dep);
    const typeIcon = dep.type === 'production' ? '🟢' : '🔵';
    console.log(`${index + 1}. ${typeIcon} ${depName}`);
    console.log(`   الملفات (${dep.files.length}): ${dep.files.slice(0, 3).join(', ')}${dep.files.length > 3 ? '...' : ''}`);
    console.log(`   الاستيرادات: ${dep.imports.slice(0, 2).join(' | ')}${dep.imports.length > 2 ? '...' : ''}`);
    console.log('');
  });

  // المكتبات غير المستخدمة
  console.log(`\\n❌ المكتبات غير المستخدمة (${unusedDeps.length}):`);
  console.log('-'.repeat(50));

  unusedDeps.forEach((dep, index) => {
    const depName = Object.keys(usageInfo).find(key => usageInfo[key] === dep);
    const typeIcon = dep.type === 'production' ? '🔴' : '🟡';
    console.log(`${index + 1}. ${typeIcon} ${depName} (${dep.type})`);
  });

  // توصيات التنظيف
  if (unusedDeps.length > 0) {
    console.log(`\\n🧹 توصيات التنظيف:`);
    console.log('-'.repeat(30));

    const unusedProd = unusedDeps.filter(dep => dep.type === 'production');
    const unusedDev = unusedDeps.filter(dep => dep.type === 'development');

    if (unusedProd.length > 0) {
      console.log(`\\nيمكن إزالة مكتبات الإنتاج التالية:`);
      unusedProd.forEach(dep => {
        const depName = Object.keys(usageInfo).find(key => usageInfo[key] === dep);
        console.log(`npm uninstall ${depName}`);
      });
    }

    if (unusedDev.length > 0) {
      console.log(`\\nيمكن إزالة مكتبات التطوير التالية:`);
      unusedDev.forEach(dep => {
        const depName = Object.keys(usageInfo).find(key => usageInfo[key] === dep);
        console.log(`npm uninstall --save-dev ${depName}`);
      });
    }
  }

  // أهم المكتبات حسب الاستخدام
  console.log(`\\n🔥 أهم المكتبات حسب عدد الملفات:`);
  console.log('-'.repeat(40));

  const topUsed = sortedUsed.slice(0, 10);
  topUsed.forEach((dep, index) => {
    const depName = Object.keys(usageInfo).find(key => usageInfo[key] === dep);
    console.log(`${index + 1}. ${depName}: ${dep.files.length} ملف`);
  });

  console.log('\\n' + '='.repeat(80));
  console.log('🎯 تم انتهاء التحليل بنجاح!');
}

// تشغيل التحليل
function runAnalysis() {
  console.log('🚀 بدء تحليل استخدام المكتبات...');

  initializeUsageInfo();

  const files = getAllFiles(process.cwd());
  console.log(`📂 تم العثور على ${files.length} ملف للتحليل...`);

  files.forEach(analyzeFile);

  generateReport();
}

// تشغيل التحليل
runAnalysis();
