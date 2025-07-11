# حل مشكلة Visual Studio Build Tools

## المشكلة
`node-gyp` يحتاج إلى Visual Studio Build Tools مع C++ support، لكن التثبيت عبر `windows-build-tools` فشل.

## الحل الأول: تثبيت Visual Studio Build Tools يدوياً

### الخطوات:
1. **تحميل Visual Studio Build Tools**:
   - انتقل إلى: https://visualstudio.microsoft.com/downloads/
   - تحميل "Build Tools for Visual Studio 2022"

2. **تثبيت المكونات المطلوبة**:
   - شغل الملف المحمل
   - اختر "Individual components"
   - اختر هذه المكونات:
     - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools (latest)**
     - ✅ **Windows 10 SDK** (أحدث إصدار)
     - ✅ **CMake tools for Visual Studio**
     - ✅ **C++ CMake tools for Windows**

3. **تعديل متغيرات البيئة**:
   ```cmd
   set VCTargetsPath=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Microsoft\VC\v170\
   set VCINSTALLDIR=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\
   ```

## الحل الثاني: تعديل إعدادات npm

### طريقة مؤقتة:
```bash
npm config set msvs_version 2022
npm config set node_gyp "C:\Program Files\nodejs\node_modules\npm\node_modules\node-gyp\bin\node-gyp.js"
```

## الحل الثالث: تخطي native modules إذا لم تكن ضرورية

### تعديل package.json:
```json
{
  "scripts": {
    "build:win": "npm run build && electron-builder --win --config.buildDependenciesFromSource=false --config.npmRebuild=false"
  }
}
```

## الحل الرابع: استخدام precompiled binaries

### إضافة إلى package.json:
```json
{
  "scripts": {
    "install:better-sqlite3": "npm install better-sqlite3 --build-from-source=false",
    "install:sqlite3": "npm install sqlite3 --build-from-source=false"
  }
}
```

## اختبار الحل:
```bash
# تنظيف node_modules
npm run clean
rm -rf node_modules

# إعادة تثبيت
npm install

# اختبار البناء
npm run build:win
```

## إذا استمرت المشكلة:
```bash
# تجربة force rebuild
npm rebuild --force

# أو
npm install --force
```
