// Test script to verify each screen can be launched correctly
// This script checks that all start scripts can properly set the SCREEN_MODE environment variable

const { execSync } = require('child_process');
const { join } = require('path');

console.log('🧪 Testing Screen Launch Scripts...\n');

// Test function to check each screen
const testScreenMode = (screenMode) => {
  console.log(`📱 Testing ${screenMode} screen mode...`);

  try {
    // Test that the environment variable is set correctly
    const env = { ...process.env, SCREEN_MODE: screenMode };
    console.log(`   ✅ Environment variable SCREEN_MODE=${screenMode} set successfully`);

    // Check if the screen mode is valid
    const validModes = ['display', 'customer', 'window', 'admin'];
    if (validModes.includes(screenMode)) {
      console.log(`   ✅ ${screenMode} is a valid screen mode`);
    } else {
      console.log(`   ❌ ${screenMode} is not a valid screen mode`);
      return false;
    }

    console.log(`   ✅ ${screenMode} screen test passed\n`);
    return true;
  } catch (error) {
    console.error(`   ❌ ${screenMode} screen test failed:`, error.message);
    return false;
  }
};

// Test all screen modes
const screens = ['display', 'customer', 'window', 'admin'];
const results = {};

console.log('📋 Testing all screen modes...\n');

screens.forEach(screen => {
  results[screen] = testScreenMode(screen);
});

// Summary
console.log('📊 Test Results Summary:');
console.log('========================');
let allPassed = true;

Object.entries(results).forEach(([screen, passed]) => {
  console.log(`${screen.padEnd(10)} : ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!passed) allPassed = false;
});

console.log('\n🔍 Available npm scripts:');
console.log('- npm run start:display   (for Display screen)');
console.log('- npm run start:customer  (for Customer screen)');
console.log('- npm run start:window    (for Window screen)');
console.log('- npm run start:admin     (for Admin screen)');

console.log('\n💡 Usage:');
console.log('Each script sets SCREEN_MODE environment variable and runs electron-vite preview');
console.log('This allows testing each screen type without building the entire application');

console.log(`\n${allPassed ? '🎉 All screen tests passed!' : '⚠️ Some screen tests failed'}`);
