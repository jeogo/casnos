const path = require('path');
const fs = require('fs');

// Test the PDF storage path resolution for both development and production
console.log('🧪 Testing PDF Storage Path Resolution...\n');

// Simulate development environment (current directory)
console.log('📁 Current Working Directory (process.cwd()):', process.cwd());
console.log('📁 Development PDF Storage Path:', path.join(process.cwd(), 'resources', 'tickets'));

// Simulate production environment
console.log('\n🏭 Simulating Production Environment:');
const simulatedResourcesPath = path.join(process.cwd(), 'dist', 'Display', 'win-unpacked', 'resources');
console.log('📁 Simulated Resources Path:', simulatedResourcesPath);

// Check if the tickets folder exists in the build
const ticketsPath = path.join(simulatedResourcesPath, 'tickets');
console.log('📁 Build Tickets Path:', ticketsPath);
console.log('✅ Tickets folder exists in build:', fs.existsSync(ticketsPath));

// Check if server exists
const serverPath = path.join(simulatedResourcesPath, 'server', 'server.js');
console.log('📁 Server Path:', serverPath);
console.log('✅ Server exists in build:', fs.existsSync(serverPath));

// Test PDF path generation
const today = new Date().toISOString().split('T')[0];
const testPdfPath = path.join(ticketsPath, today, 'test-service-001.pdf');
console.log('\n📄 Sample PDF Path:', testPdfPath);

// Check if date folder exists, if not, create it
const dateFolder = path.join(ticketsPath, today);
if (!fs.existsSync(dateFolder)) {
  console.log('📁 Creating date folder:', dateFolder);
  fs.mkdirSync(dateFolder, { recursive: true });
}

console.log('✅ Date folder exists:', fs.existsSync(dateFolder));

// Test writing a sample PDF (simulate ticket generation)
const testContent = 'This is a test PDF content';
try {
  fs.writeFileSync(testPdfPath, testContent);
  console.log('✅ Test PDF written successfully');

  // Clean up
  fs.unlinkSync(testPdfPath);
  console.log('✅ Test PDF cleaned up');
} catch (error) {
  console.error('❌ Error writing test PDF:', error.message);
}

console.log('\n🎯 Path Resolution Summary:');
console.log('- Development: Uses process.cwd() + resources/tickets');
console.log('- Production: Should use process.resourcesPath + tickets');
console.log('- Current implementation: Uses process.cwd() in both cases');
console.log('- Recommendation: Update to use process.resourcesPath in production');
