const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function convertIcons() {
  try {
    console.log('🎨 Converting PNG icons to ICO format...');

    // مسار الصورة الأصلية
    const pngPath = path.join(__dirname, 'resources/assets/logo.png');
    const icoPath = path.join(__dirname, 'build/icon.ico');

    // التحقق من وجود الصورة
    if (!fs.existsSync(pngPath)) {
      console.error('❌ PNG icon not found:', pngPath);
      return;
    }

    // تحويل PNG إلى ICO
    const buf = await pngToIco(pngPath);

    // إنشاء مجلد build إذا لم يكن موجوداً
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // حفظ الأيقونة
    fs.writeFileSync(icoPath, buf);

    console.log('✅ ICO icon created successfully:', icoPath);

    // نسخ PNG أيضاً
    const pngIconPath = path.join(__dirname, 'build/icon.png');
    fs.copyFileSync(pngPath, pngIconPath);

    console.log('✅ PNG icon copied successfully:', pngIconPath);

  } catch (error) {
    console.error('❌ Error converting icons:', error);
  }
}

convertIcons();
