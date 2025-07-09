# 🏗️ CASNOS Build Plan - خطة البناء التفصيلية

## 📋 الهدف من البناء
إنشاء ملفات تنفيذية منفصلة لكل شاشة من شاشات CASNOS مع ضمان أن كل شاشة تحتوي فقط على الموارد التي تحتاجها.

## 🎯 البناء المطلوب

### 📁 هيكل مجلد dist النهائي:
```
dist/
├── CASNOS-Display/
│   ├── CASNOS-Display.exe
│   ├── resources/
│   │   ├── logo.png
│   │   ├── assets/logo.png
│   │   ├── voice/ (جميع ملفات الصوت)
│   │   ├── video/ (جميع ملفات الفيديو)
│   │   └── fonts/ (جميع الخطوط)
│   └── data/ (قاعدة البيانات المحلية)
│
├── CASNOS-Customer/
│   ├── CASNOS-Customer.exe
│   ├── resources/
│   │   ├── logo.png
│   │   ├── assets/logo.png
│   │   └── fonts/ (الخطوط فقط)
│   └── data/ (قاعدة البيانات المحلية)
│
├── CASNOS-Window/
│   ├── CASNOS-Window.exe
│   ├── resources/
│   │   ├── logo.png
│   │   ├── assets/logo.png
│   │   └── fonts/ (الخطوط فقط)
│   └── data/ (قاعدة البيانات المحلية)
│
├── CASNOS-Admin/
│   ├── CASNOS-Admin.exe
│   ├── resources/
│   │   ├── logo.png
│   │   ├── assets/logo.png
│   │   └── fonts/ (الخطوط فقط)
│   └── data/ (قاعدة البيانات المحلية)
│
└── CASNOS-Server/
    ├── CASNOS-Server.exe
    ├── resources/
    │   ├── logo.png
    │   └── assets/logo.png
    └── data/ (قاعدة البيانات الرئيسية)
```

## 🛠️ خطة التنفيذ التفصيلية

### المرحلة 1: تحضير ملفات البناء
1. **تحديث electron-builder.yml**
   - إنشاء تكوينات منفصلة لكل شاشة
   - تحديد الموارد المطلوبة لكل شاشة
   - ضبط أسماء الملفات التنفيذية

2. **إنشاء سكريبت بناء مخصص**
   ```javascript
   // build-screens.js
   const buildScreens = async () => {
     const screens = ['display', 'customer', 'window', 'admin'];

     for (const screen of screens) {
       await buildSingleScreen(screen);
     }
   };
   ```

### المرحلة 2: تكوين الموارد لكل شاشة

#### 🖥️ شاشة العرض (Display)
**الموارد المطلوبة:**
- ✅ جميع ملفات الصوت (voice/)
- ✅ جميع ملفات الفيديو (video/)
- ✅ جميع الخطوط (fonts/)
- ✅ اللوجو (logo.png, assets/logo.png)

**المسار:** `CASNOS-Display/`

#### 👥 شاشة العملاء (Customer)
**الموارد المطلوبة:**
- ✅ الخطوط فقط (fonts/)
- ✅ اللوجو (logo.png, assets/logo.png)
- ❌ لا تحتاج: voice/, video/

**المسار:** `CASNOS-Customer/`

#### 🪟 شاشة الشباك (Window)
**الموارد المطلوبة:**
- ✅ الخطوط فقط (fonts/)
- ✅ اللوجو (logo.png, assets/logo.png)
- ❌ لا تحتاج: voice/, video/

**المسار:** `CASNOS-Window/`

#### ⚙️ شاشة الإدارة (Admin)
**الموارد المطلوبة:**
- ✅ الخطوط فقط (fonts/)
- ✅ اللوجو (logo.png, assets/logo.png)
- ❌ لا تحتاج: voice/, video/

**المسار:** `CASNOS-Admin/`

### المرحلة 3: سكريبت البناء المخصص

```javascript
// build-custom.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const SCREENS = {
  display: {
    name: 'CASNOS-Display',
    resources: ['logo.png', 'assets/', 'fonts/', 'voice/', 'video/'],
    screenMode: 'display'
  },
  customer: {
    name: 'CASNOS-Customer',
    resources: ['logo.png', 'assets/', 'fonts/'],
    screenMode: 'customer'
  },
  window: {
    name: 'CASNOS-Window',
    resources: ['logo.png', 'assets/', 'fonts/'],
    screenMode: 'window'
  },
  admin: {
    name: 'CASNOS-Admin',
    resources: ['logo.png', 'assets/', 'fonts/'],
    screenMode: 'admin'
  }
};

async function buildScreen(screenType) {
  const config = SCREENS[screenType];

  // 1. بناء الكود
  process.env.SCREEN_MODE = config.screenMode;
  execSync('npm run build', { stdio: 'inherit' });

  // 2. إنشاء مجلد مخصص
  const outputDir = path.join('dist', config.name);
  await fs.ensureDir(outputDir);

  // 3. نسخ الملفات التنفيذية
  await fs.copy('dist/win-unpacked', outputDir);

  // 4. تنظيف الموارد غير المطلوبة
  await cleanupResources(outputDir, config.resources);

  // 5. إعادة تسمية الملف التنفيذي
  await fs.rename(
    path.join(outputDir, 'CASNOS.exe'),
    path.join(outputDir, `${config.name}.exe`)
  );
}
```

### المرحلة 4: تحديث electron-builder.yml

```yaml
# electron-builder-display.yml
appId: com.focusplus.casnos.display
productName: CASNOS Display
directories:
  buildResources: build
files:
  - from: "out/renderer"
    filter: ["**/*"]
  - from: "out/main"
    filter: ["**/*"]
  - from: "out/preload"
    filter: ["**/*"]
asarUnpack:
  - resources/logo.png
  - resources/assets/**
  - resources/fonts/**
  - resources/voice/**
  - resources/video/**
win:
  executableName: CASNOS-Display
```

### المرحلة 5: سكريبت package.json الجديد

```json
{
  "scripts": {
    "build:all-screens": "node build-custom.js",
    "build:display": "cross-env SCREEN_MODE=display npm run build && electron-builder --config electron-builder-display.yml",
    "build:customer": "cross-env SCREEN_MODE=customer npm run build && electron-builder --config electron-builder-customer.yml",
    "build:window": "cross-env SCREEN_MODE=window npm run build && electron-builder --config electron-builder-window.yml",
    "build:admin": "cross-env SCREEN_MODE=admin npm run build && electron-builder --config electron-builder-admin.yml"
  }
}
```

## 🔍 التحقق من البناء

### اختبار كل شاشة:
1. **شاشة العرض:** تشغيل فيديو + صوت
2. **شاشة العملاء:** طباعة تذاكر
3. **شاشة الشباك:** استدعاء تذاكر
4. **شاشة الإدارة:** إدارة النظام

### التحقق من الموارد:
```bash
# فحص محتويات كل مجلد
ls -la dist/CASNOS-Display/resources/
ls -la dist/CASNOS-Customer/resources/
ls -la dist/CASNOS-Window/resources/
ls -la dist/CASNOS-Admin/resources/
```

## 📦 حجم الملفات المتوقع

- **CASNOS-Display:** ~150-200 MB (يحتوي على جميع الموارد)
- **CASNOS-Customer:** ~80-100 MB (خطوط + لوجو فقط)
- **CASNOS-Window:** ~80-100 MB (خطوط + لوجو فقط)
- **CASNOS-Admin:** ~80-100 MB (خطوط + لوجو فقط)

## 🎯 مميزات هذا التصميم

1. **الأمان:** كل شاشة منفصلة تمامًا
2. **الأداء:** كل شاشة تحتوي فقط على ما تحتاجه
3. **التوزيع:** يمكن توزيع كل شاشة على جهاز منفصل
4. **الصيانة:** سهولة تحديث شاشة واحدة دون تأثير على الباقي
5. **الموارد:** استخدام أمثل للذاكرة والتخزين

## 🚀 خطوات التنفيذ

1. **تشغيل تحليل المكتبات:**
   ```bash
   node analyze-dependencies.js
   ```

2. **إنشاء سكريبت البناء المخصص**
3. **تكوين ملفات electron-builder منفصلة**
4. **اختبار البناء لكل شاشة**
5. **التحقق من الموارد والأحجام**
6. **توثيق عملية التوزيع**

هل تريد المتابعة بتنفيذ هذه الخطة؟
