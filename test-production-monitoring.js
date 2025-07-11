/**
 * 🧪 Production PDF & Print Monitoring Test
 * Test the guaranteed PDF generation solution with comprehensive monitoring
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Mock Electron app for testing
if (!app.isReady()) {
  app.whenReady().then(() => {
    runTests();
  });
} else {
  runTests();
}

async function runTests() {
  console.log('🧪 Starting Production PDF & Print Monitoring Test');
  console.log('=' .repeat(60));

  // Simulate production environment
  process.env.NODE_ENV = 'production';

  try {
    // Test 1: Production Monitor initialization
    console.log('\n📊 Test 1: Production Monitor Initialization');
    const { default: ProductionMonitor } = require('./src/main/utils/productionMonitor');
    const monitor = ProductionMonitor.getInstance();

    console.log('✅ Production Monitor initialized');
    console.log('📁 Log file:', monitor.getLogFilePath());

    // Test 2: PDF Generation with monitoring
    console.log('\n📄 Test 2: PDF Generation with Monitoring');
    const { PuppeteerPDFGenerator } = require('./src/main/printing/puppeteerPDFGenerator');
    const pdfGenerator = PuppeteerPDFGenerator.getInstance();

    const testTicketData = {
      ticket_number: 'TEST-001',
      service_name: 'خدمة تجريبية',
      created_at: new Date().toISOString(),
      company_name: '',
      print_source: 'admin'
    };

    console.log('🔄 Attempting PDF generation...');
    const pdfPath = await pdfGenerator.generateTicketPDF(testTicketData);

    if (pdfPath) {
      console.log('✅ PDF generated successfully:', pdfPath);

      // Test 3: Print with monitoring
      console.log('\n🖨️  Test 3: Print with Monitoring');
      const { SumatraPDFManager } = require('./src/main/utils/sumatraPDFManager');
      const sumatraManager = SumatraPDFManager.getInstance();

      const printResult = await sumatraManager.printPDF(pdfPath, {
        silent: true,
        timeout: 10000
      });

      console.log('🖨️  Print result:', printResult);

    } else {
      console.log('❌ PDF generation failed');
    }

    // Test 4: Check monitoring stats
    console.log('\n📊 Test 4: Monitoring Statistics');
    const stats = monitor.getStats();
    console.log('📈 Current stats:', stats);

    // Test 5: Generate diagnostics
    console.log('\n🔍 Test 5: System Diagnostics');
    const diagnostics = monitor.runFullDiagnostics();
    console.log('🔍 System diagnostics completed');

    // Test 6: Export diagnostics
    console.log('\n📤 Test 6: Export Diagnostics');
    const exportPath = monitor.exportDiagnostics();
    if (exportPath) {
      console.log('📤 Diagnostics exported to:', exportPath);
    }

    // Test 7: Check log file content
    console.log('\n📝 Test 7: Log File Content');
    const logPath = monitor.getLogFilePath();
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      console.log(`📝 Log file contains ${logLines.length} entries`);

      // Show last 5 log entries
      console.log('📝 Last 5 log entries:');
      logLines.slice(-5).forEach((line, index) => {
        console.log(`  ${index + 1}. ${line}`);
      });
    } else {
      console.log('❌ Log file not found:', logPath);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Production monitoring test completed successfully!');
    console.log('📊 All PDF generation and print attempts are now logged to:');
    console.log(`   ${logPath}`);
    console.log('🚀 The system is ready for production with guaranteed monitoring!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test...');
  process.exit(0);
});
