const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Printing System Fixes...\n');

// Test 1: Environment Detection
console.log('1️⃣ Environment Detection:');
const isDev = process.env.NODE_ENV === 'development';
console.log(`   Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   Current Directory: ${process.cwd()}`);
console.log(`   Resources Path: ${process.resourcesPath || 'undefined'}`);

// Test 2: SumatraPDF Path Resolution
console.log('\n2️⃣ SumatraPDF Path Resolution:');
const possibleSumatraPaths = [];

if (isDev) {
  possibleSumatraPaths.push(
    path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe'),
    path.join(__dirname, '../../resources/assets/SumatraPDF.exe'),
    path.join(__dirname, '../../../resources/assets/SumatraPDF.exe')
  );
} else {
  if (process.resourcesPath) {
    possibleSumatraPaths.push(
      path.join(process.resourcesPath, 'assets', 'SumatraPDF.exe'),
      path.join(process.resourcesPath, 'SumatraPDF.exe'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'assets', 'SumatraPDF.exe')
    );
  }
  possibleSumatraPaths.push(
    path.join(process.cwd(), 'resources', 'assets', 'SumatraPDF.exe'),
    path.join(path.dirname(process.execPath), 'resources', 'assets', 'SumatraPDF.exe')
  );
}

let foundSumatraPDF = null;
console.log('   Checking paths:');
possibleSumatraPaths.forEach((testPath, index) => {
  const exists = fs.existsSync(testPath);
  console.log(`   ${index + 1}. ${exists ? '✅' : '❌'} ${testPath}`);
  if (exists && !foundSumatraPDF) {
    foundSumatraPDF = testPath;
  }
});

console.log(`   Found SumatraPDF: ${foundSumatraPDF || 'NOT FOUND'}`);

// Test 3: AppData Path Resolution
console.log('\n3️⃣ AppData Path Resolution:');
try {
  // Simulate Electron app.getPath('userData')
  const os = require('os');
  const appName = 'casnose'; // This should match your app name
  const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', appName);

  console.log(`   AppData Path: ${appDataPath}`);
  console.log(`   Database Path: ${path.join(appDataPath, 'data', 'queue.db')}`);
  console.log(`   PDF Storage Path: ${path.join(appDataPath, 'tickets')}`);

  // Check if directories exist
  console.log(`   AppData exists: ${fs.existsSync(appDataPath)}`);
  console.log(`   Data folder exists: ${fs.existsSync(path.join(appDataPath, 'data'))}`);
  console.log(`   Tickets folder exists: ${fs.existsSync(path.join(appDataPath, 'tickets'))}`);

} catch (error) {
  console.error('   Error resolving AppData path:', error.message);
}

// Test 4: Current Build Assets
console.log('\n4️⃣ Current Build Assets:');
const assetsPath = path.join(process.cwd(), 'resources', 'assets');
console.log(`   Assets Path: ${assetsPath}`);
console.log(`   Assets exists: ${fs.existsSync(assetsPath)}`);

if (fs.existsSync(assetsPath)) {
  const files = fs.readdirSync(assetsPath);
  console.log(`   Assets files: ${files.join(', ')}`);
}

// Test 5: Font Paths
console.log('\n5️⃣ Font Paths:');
const fontPath = path.join(process.cwd(), 'resources', 'fonts');
console.log(`   Fonts Path: ${fontPath}`);
console.log(`   Fonts exists: ${fs.existsSync(fontPath)}`);

if (fs.existsSync(fontPath)) {
  const fonts = fs.readdirSync(fontPath);
  console.log(`   Font files: ${fonts.slice(0, 5).join(', ')}${fonts.length > 5 ? '...' : ''}`);
}

console.log('\n🎯 Test Summary:');
console.log(`✅ Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`${foundSumatraPDF ? '✅' : '❌'} SumatraPDF: ${foundSumatraPDF ? 'Found' : 'Missing'}`);
console.log(`${fs.existsSync(assetsPath) ? '✅' : '❌'} Assets: ${fs.existsSync(assetsPath) ? 'Available' : 'Missing'}`);
console.log(`${fs.existsSync(fontPath) ? '✅' : '❌'} Fonts: ${fs.existsSync(fontPath) ? 'Available' : 'Missing'}`);

console.log('\n💡 Recommendations:');
if (!foundSumatraPDF) {
  console.log('- Ensure SumatraPDF.exe is included in the build resources');
  console.log('- Check electron-builder configuration for extraResources');
}
if (!fs.existsSync(assetsPath)) {
  console.log('- Verify resources/assets folder is properly included in build');
}
if (!fs.existsSync(fontPath)) {
  console.log('- Verify resources/fonts folder is properly included in build');
}
