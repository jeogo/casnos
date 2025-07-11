# 🔧 إصلاح مشاكل البناء - CASNOS Build Fix Script
# CASNOS Build Fix Script - Fixes common electron-builder issues

Write-Host "🔧 بدء إصلاح مشاكل البناء..." -ForegroundColor Yellow
Write-Host "🔧 Starting build issues fix..." -ForegroundColor Yellow

# التحقق من الصلاحيات
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️ هذا السكريبت يحتاج صلاحيات المسؤول!" -ForegroundColor Red
    Write-Host "⚠️ This script needs administrator privileges!" -ForegroundColor Red
    Write-Host "💡 شغل PowerShell كمسؤول وحاول مرة أخرى" -ForegroundColor Yellow
    Write-Host "💡 Run PowerShell as Administrator and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ تم تشغيل السكريبت بصلاحيات المسؤول" -ForegroundColor Green

# الانتقال لمجلد المشروع
$projectPath = "C:\Users\pc-jeogo\Desktop\FocusPlus\casnos"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "📂 تم الانتقال لمجلد المشروع: $projectPath" -ForegroundColor Green
} else {
    Write-Host "❌ لم يتم العثور على مجلد المشروع: $projectPath" -ForegroundColor Red
    exit 1
}

# تنظيف الملفات والمجلدات
Write-Host "🧹 تنظيف الملفات والمجلدات..." -ForegroundColor Yellow

# تنظيف dist
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
    Write-Host "🗑️ تم حذف مجلد dist" -ForegroundColor Green
}

# تنظيف out
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out" -ErrorAction SilentlyContinue
    Write-Host "🗑️ تم حذف مجلد out" -ForegroundColor Green
}

# تنظيف node_modules cache
$nodeModulesCache = "node_modules\.cache"
if (Test-Path $nodeModulesCache) {
    Remove-Item -Recurse -Force $nodeModulesCache -ErrorAction SilentlyContinue
    Write-Host "🗑️ تم حذف node_modules cache" -ForegroundColor Green
}

# تنظيف electron-builder cache
$electronBuilderCache = "$env:LOCALAPPDATA\electron-builder\Cache"
if (Test-Path $electronBuilderCache) {
    Remove-Item -Recurse -Force $electronBuilderCache -ErrorAction SilentlyContinue
    Write-Host "🗑️ تم حذف electron-builder cache" -ForegroundColor Green
}

# تنظيف npm cache
$npmCache = "$env:APPDATA\npm-cache"
if (Test-Path $npmCache) {
    Remove-Item -Recurse -Force $npmCache -ErrorAction SilentlyContinue
    Write-Host "🗑️ تم حذف npm cache" -ForegroundColor Green
}

# إضافة استثناءات لـ Windows Defender
Write-Host "🛡️ إضافة استثناءات لـ Windows Defender..." -ForegroundColor Yellow

try {
    Add-MpPreference -ExclusionPath "$projectPath\dist" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$projectPath\node_modules" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\electron-builder" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "makensis.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "electron.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "node.exe" -ErrorAction SilentlyContinue
    Write-Host "✅ تم إضافة استثناءات Windows Defender" -ForegroundColor Green
} catch {
    Write-Host "⚠️ لم يتم إضافة استثناءات Windows Defender (قد تحتاج إذن إضافي)" -ForegroundColor Yellow
}

# إعادة تثبيت dependencies
Write-Host "📦 إعادة تثبيت Dependencies..." -ForegroundColor Yellow
npm install --force
Write-Host "✅ تم إعادة تثبيت Dependencies" -ForegroundColor Green

# إعداد متغيرات البيئة
Write-Host "🔧 إعداد متغيرات البيئة..." -ForegroundColor Yellow
$env:ELECTRON_BUILDER_CACHE = "C:\temp\electron-builder-cache"
$env:ELECTRON_CACHE = "C:\temp\electron-cache"
$env:npm_config_cache = "C:\temp\npm-cache"
$env:npm_config_tmp = "C:\temp\npm-tmp"

# إنشاء مجلدات temp
New-Item -ItemType Directory -Force -Path "C:\temp\electron-builder-cache" | Out-Null
New-Item -ItemType Directory -Force -Path "C:\temp\electron-cache" | Out-Null
New-Item -ItemType Directory -Force -Path "C:\temp\npm-cache" | Out-Null
New-Item -ItemType Directory -Force -Path "C:\temp\npm-tmp" | Out-Null

Write-Host "✅ تم إعداد متغيرات البيئة" -ForegroundColor Green

# محاولة البناء
Write-Host "🚀 محاولة بناء Customer Screen..." -ForegroundColor Yellow

# استخدام الإعدادات الآمنة
Write-Host "🔧 استخدام الإعدادات الآمنة..." -ForegroundColor Yellow
$buildResult = npm run build:customer-safe 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 تم بناء Customer Screen بنجاح!" -ForegroundColor Green
    Write-Host "📁 تجد الملفات في: dist/Customer-Safe" -ForegroundColor Green
} else {
    Write-Host "❌ فشل في بناء Customer Screen" -ForegroundColor Red
    Write-Host "🔄 محاولة بناء ZIP بديل..." -ForegroundColor Yellow

    # محاولة بناء ZIP كبديل
    npx electron-builder --config build-configs/customer-safe.config.js --win --ia32 --dir

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم بناء مجلد التطبيق بنجاح" -ForegroundColor Green
        Write-Host "📁 تجد الملفات في: dist/Customer-Safe/win-ia32-unpacked" -ForegroundColor Green
    } else {
        Write-Host "❌ فشل في البناء - راجع الرسائل أعلاه" -ForegroundColor Red
    }
}

Write-Host "🏁 انتهى السكريبت" -ForegroundColor Yellow

# انتظار ضغط مفتاح
Write-Host "اضغط أي مفتاح للمتابعة..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
