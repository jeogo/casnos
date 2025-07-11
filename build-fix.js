#!/usr/bin/env node

/**
 * 🔧 Fix Node-gyp Build Issues
 * حل مشاكل بناء Native Modules
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 CASNOS Build Fix - حل مشاكل البناء');
console.log('='.repeat(50));

// تحديد ما إذا كان يجب بناء Native modules
const shouldBuildNative = process.argv.includes('--native');

if (shouldBuildNative) {
  console.log('⚠️  Native modules build enabled - requires Visual Studio Build Tools');

  // فحص وجود Visual Studio Build Tools
  try {
    execSync('where msbuild', { stdio: 'ignore' });
    console.log('✅ Visual Studio Build Tools found');
  } catch (error) {
    console.log('❌ Visual Studio Build Tools not found');
    console.log('');
    console.log('🔗 Please install Visual Studio Build Tools:');
    console.log('   https://visualstudio.microsoft.com/visual-cpp-build-tools/');
    console.log('');
    console.log('💡 Or run without --native flag to skip native modules build');
    process.exit(1);
  }
} else {
  console.log('✅ Native modules build disabled - using pre-built modules');
}

// تنظيف المجلدات
console.log('\n🧹 Cleaning build directories...');
try {
  execSync('npm run clean', { stdio: 'inherit' });
  console.log('✅ Clean completed');
} catch (error) {
  console.log('⚠️  Clean failed, continuing...');
}

// بناء التطبيق
console.log('\n📦 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed');
} catch (error) {
  console.log('❌ Build failed');
  process.exit(1);
}

// بناء التطبيق المرغوب
const screenType = process.argv[2] || 'customer';
console.log(`\n🎯 Building ${screenType} screen...`);

try {
  const command = `npm run build:${screenType}`;
  execSync(command, { stdio: 'inherit' });
  console.log(`✅ ${screenType} screen built successfully!`);
} catch (error) {
  console.log(`❌ Failed to build ${screenType} screen`);
  process.exit(1);
}

console.log('\n🎉 Build process completed successfully!');
console.log('📁 Check the dist/ directory for your built application.');
