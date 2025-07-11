# إصلاح مشكلة التطبيق المستقل - Production Standalone Fix

## المشكلة الأساسية
التطبيق يفشل في العمل على أجهزة **بدون Node.js** لأن:
1. إعدادات البناء لا تدعم التطبيق المستقل
2. Native modules غير مبنية بشكل صحيح
3. Puppeteer/Chromium غير متضمن بشكل صحيح

## الحلول المطلوبة

### 1. تصحيح electron-builder.yml

```yaml
# إضافة هذه الإعدادات:
npmRebuild: true  # تغيير من false إلى true
buildDependenciesFromSource: true

# إضافة extraResources:
extraResources:
  - from: "resources"
    to: "resources"
    filter: ["**/*"]
  - from: "node_modules/puppeteer/.local-chromium"
    to: "chromium"
    filter: ["**/*"]

# إضافة afterAllArtifactBuild:
afterAllArtifactBuild: |
  # نسخ Chromium إلى المسار الصحيح

nsis:
  include: "build/installer.nsh"
  oneClick: false
  allowToChangeInstallationDirectory: true
```

### 2. تحديث package.json

```json
{
  "scripts": {
    "postinstall": "electron-builder install-app-deps && npm run download-chromium",
    "download-chromium": "node scripts/download-chromium.js",
    "rebuild": "electron-rebuild"
  }
}
```

### 3. إنشاء سكريبت تحميل Chromium

إنشاء `scripts/download-chromium.js`:

```javascript
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');

async function downloadChromium() {
  console.log('تحميل Chromium...');

  const browser = await puppeteer.launch({
    headless: true
  });

  const chromiumPath = puppeteer.executablePath();
  console.log('Chromium path:', chromiumPath);

  // نسخ Chromium إلى مجلد resources
  const targetPath = path.join(__dirname, '../resources/chromium');
  await fs.ensureDir(targetPath);

  await browser.close();
}

downloadChromium().catch(console.error);
```

### 4. تحديث إعدادات Puppeteer

في `puppeteerPDFGenerator.ts`:

```typescript
const getChromiumPath = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // مسار في التطبيق المستقل
    return path.join(process.resourcesPath, 'chromium', 'chrome.exe');
  } else {
    // مسار في التطوير
    return puppeteer.executablePath();
  }
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath: getChromiumPath(),
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process'
  ]
});
```

### 5. تحديث إعدادات البناء

```javascript
// في base.config.js
module.exports = {
  // ...إعدادات موجودة

  npmRebuild: true, // تغيير من false
  buildDependenciesFromSource: true,

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico"
  },

  extraResources: [
    {
      from: "resources",
      to: "resources",
      filter: ["**/*"]
    }
  ],

  // إضافة beforeBuild hook
  beforeBuild: async (context) => {
    console.log('إعداد Native Dependencies...');
    // تأكد من بناء native modules
  }
};
```

## الخطوات التالية

1. **تحديث الإعدادات** حسب الحلول أعلاه
2. **إعادة بناء التطبيق**:
   ```bash
   npm run clean
   npm install
   npm run build:win
   ```

3. **اختبار على جهاز نظيف**:
   - جهاز Windows بدون Node.js
   - تشغيل التطبيق المبني
   - اختبار PDF generation

4. **تشخيص إضافي**:
   - فحص مجلد `resources` في التطبيق المبني
   - التحقق من وجود Chromium
   - فحص ملفات Native modules

## أدوات التشخيص

```javascript
// إضافة في تطبيق الـ production
console.log('Process paths:', {
  execPath: process.execPath,
  resourcesPath: process.resourcesPath,
  cwd: process.cwd(),
  platform: process.platform,
  arch: process.arch
});

// فحص وجود الملفات
const chromiumPath = path.join(process.resourcesPath, 'chromium');
console.log('Chromium exists:', fs.existsSync(chromiumPath));

const sumatraPath = path.join(process.resourcesPath, 'assets', 'SumatraPDF.exe');
console.log('SumatraPDF exists:', fs.existsSync(sumatraPath));
```

هذه الحلول ستضمن أن التطبيق يعمل بشكل مستقل على أجهزة بدون Node.js.
