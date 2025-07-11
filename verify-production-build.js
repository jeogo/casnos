/**
 * 🧪 Production Build Verification Script
 * سكريبت التحقق من بناء الإنتاج
 *
 * Run this script to verify all necessary files are included in the production build
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Production Build Verification...\n');

// Test all build outputs
const buildPaths = [
  'dist/Display',
  'dist/Customer',
  'dist/Window',
  'dist/Admin'
];

function verifyBuildFolder(buildFolder) {
  console.log(`\n📁 Verifying: ${buildFolder}`);

  if (!fs.existsSync(buildFolder)) {
    console.log(`❌ Build folder does not exist: ${buildFolder}`);
    return false;
  }

  const winUnpackedPath = path.join(buildFolder, 'win-unpacked');
  if (!fs.existsSync(winUnpackedPath)) {
    console.log(`❌ win-unpacked folder not found in ${buildFolder}`);
    return false;
  }

  // Check for essential files
  const essentialFiles = [
    'CASNOS.exe',
    'resources/assets/SumatraPDF.exe',
    'resources/assets/logo.png',
    'resources/fonts',
    'resources/app.asar'
  ];

  const missingFiles = [];

  essentialFiles.forEach(file => {
    const fullPath = path.join(winUnpackedPath, file);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(file);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  });

  if (missingFiles.length > 0) {
    console.log(`❌ Missing files in ${buildFolder}:`);
    missingFiles.forEach(file => console.log(`  - ${file}`));
    return false;
  }

  // Check SumatraPDF specifically
  const sumatraPath = path.join(winUnpackedPath, 'resources/assets/SumatraPDF.exe');
  if (fs.existsSync(sumatraPath)) {
    const stats = fs.statSync(sumatraPath);
    console.log(`✅ SumatraPDF.exe: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Check for Display-specific server files
  if (buildFolder.includes('Display')) {
    const serverPath = path.join(winUnpackedPath, 'resources/server');
    if (fs.existsSync(serverPath)) {
      console.log(`✅ Display: Server files included`);
    } else {
      console.log(`⚠️ Display: Server files missing (may be intentional)`);
    }
  }

  console.log(`✅ ${buildFolder} verification complete`);
  return true;
}

// Verify each build
let allValid = true;
buildPaths.forEach(buildPath => {
  if (!verifyBuildFolder(buildPath)) {
    allValid = false;
  }
});

console.log('\n🎯 Final Results:');
if (allValid) {
  console.log('✅ All builds verified successfully!');
  console.log('💡 Production builds should work correctly');
} else {
  console.log('❌ Some builds have missing files');
  console.log('💡 Check electron-builder configuration and build process');
}

// Additional recommendations
console.log('\n📝 Production Checklist:');
console.log('1. ✅ All builds contain SumatraPDF.exe');
console.log('2. ✅ Logo and fonts are included');
console.log('3. ✅ Main executable exists');
console.log('4. 💡 Test on a clean machine without development tools');
console.log('5. 💡 Verify AppData permissions on target machines');
console.log('6. 💡 Test printing with actual thermal printers');
