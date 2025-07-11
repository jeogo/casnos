const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Unified Path System...\n');

// Test the unified path system
try {
  // Simulate the unified path system
  const os = require('os');
  const appName = 'casnose'; // Match package.json name
  const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', appName);

  const paths = {
    appDataPath,
    dataPath: path.join(appDataPath, 'data'),
    ticketsPath: path.join(appDataPath, 'tickets'),
    logsPath: path.join(appDataPath, 'logs'),
    tempPath: path.join(appDataPath, 'tickets', 'temp'),
    persistentPath: path.join(appDataPath, 'data', 'persistent'),
    databasePath: path.join(appDataPath, 'data', 'queue.db'),
    persistentStorageFile: path.join(appDataPath, 'data', 'persistent', 'system-state.json'),
    logFile: path.join(appDataPath, 'logs', 'app.log')
  };

  console.log('📁 Unified Path System:');
  console.log(`   AppData: ${paths.appDataPath}`);
  console.log(`   Database: ${paths.databasePath}`);
  console.log(`   PDF Storage: ${paths.ticketsPath}`);
  console.log(`   Persistent: ${paths.persistentStorageFile}`);
  console.log(`   Logs: ${paths.logFile}`);

  console.log('\n📂 Directory Status:');
  Object.entries(paths).forEach(([key, dirPath]) => {
    if (key.endsWith('Path')) {
      const exists = fs.existsSync(dirPath);
      console.log(`   ${exists ? '✅' : '❌'} ${key}: ${exists ? 'exists' : 'missing'}`);
    }
  });

  console.log('\n📄 File Status:');
  const fileKeys = ['databasePath', 'persistentStorageFile', 'logFile'];
  fileKeys.forEach(key => {
    const filePath = paths[key];
    const exists = fs.existsSync(filePath);
    console.log(`   ${exists ? '✅' : '❌'} ${key}: ${exists ? 'exists' : 'missing'}`);
  });

  // Test database accessibility
  console.log('\n🗄️ Database Test:');
  if (fs.existsSync(paths.databasePath)) {
    const stats = fs.statSync(paths.databasePath);
    console.log(`   ✅ Database size: ${stats.size} bytes`);
    console.log(`   ✅ Last modified: ${stats.mtime.toISOString()}`);
  } else {
    console.log('   ❌ Database file not found');
  }

  // Test PDF directory
  console.log('\n📋 PDF Storage Test:');
  if (fs.existsSync(paths.ticketsPath)) {
    const files = fs.readdirSync(paths.ticketsPath);
    console.log(`   ✅ PDF directory exists with ${files.length} items`);
    if (files.length > 0) {
      console.log(`   📁 Items: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
    }
  } else {
    console.log('   ❌ PDF storage directory not found');
  }

  console.log('\n🎯 Summary:');
  const allPathsExist = Object.entries(paths)
    .filter(([key]) => key.endsWith('Path'))
    .every(([, dirPath]) => fs.existsSync(dirPath));

  console.log(`${allPathsExist ? '✅' : '⚠️'} Unified Path System: ${allPathsExist ? 'Fully operational' : 'Needs initialization'}`);

  if (!allPathsExist) {
    console.log('\n💡 Next Steps:');
    console.log('1. Run the application once to initialize AppData structure');
    console.log('2. Test PDF generation and database operations');
    console.log('3. Verify printing system functionality');
  }

} catch (error) {
  console.error('❌ Error testing unified path system:', error.message);
}
