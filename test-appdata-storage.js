const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Test AppData PDF storage
function testAppDataStorage() {
  console.log('🧪 Testing AppData PDF Storage...\n');

  // Get AppData path
  app.whenReady().then(() => {
    const appDataPath = app.getPath('userData');
    const ticketsPath = path.join(appDataPath, 'tickets');

    console.log('📁 AppData Path:', appDataPath);
    console.log('📁 Tickets Path:', ticketsPath);

    // Create test directory
    if (!fs.existsSync(ticketsPath)) {
      fs.mkdirSync(ticketsPath, { recursive: true });
      console.log('✅ Created tickets directory');
    }

    // Test file creation
    const today = new Date().toISOString().split('T')[0];
    const testFolder = path.join(ticketsPath, today);
    const testFile = path.join(testFolder, 'test-001.pdf');

    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder, { recursive: true });
    }

    fs.writeFileSync(testFile, 'Test PDF content');
    console.log('✅ Test PDF created:', testFile);

    // Cleanup
    fs.unlinkSync(testFile);
    console.log('✅ Test completed successfully');

    app.quit();
  });
}

testAppDataStorage();
