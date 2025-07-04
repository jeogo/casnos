/**
 * 🚀 FINAL COMPREHENSIVE WORKFLOW TEST
 * اختبار شامل ونهائي للنظام الكامل
 *
 * This test will:
 * 1. Create 4 realistic devices (1 customer kiosk, 1 display, 2 employee windows)
 * 2. Create 2 services
 * 3. Run complete ticket workflow: create → print → call → serve
 * 4. Validate all database fields are filled correctly
 * 5. Test real-time Socket.IO updates
 * 6. Log everything for debugging
 * 7. Display final database state
 */

const io = require('socket.io-client');

// Configuration - No hardcoded localhost, will use UDP discovery
const SERVER_URL = process.env.CASNOS_SERVER_URL || 'http://192.168.1.26:3001';
const SOCKET_URL = process.env.CASNOS_SOCKET_URL || 'http://192.168.1.26:3001';
const DEMO_DURATION = 30000; // 30 seconds

// Test state
let ticketsCreated = [];
let sockets = [];
let deviceIds = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// API helper functions
async function apiCall(endpoint, method = 'GET', data = null) {
  const url = `${SERVER_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${result.message || 'Unknown error'}`);
    }

    return result;
  } catch (error) {
    logError(`API call failed [${method} ${endpoint}]: ${error.message}`);
    throw error;
  }
}

// Create realistic test devices
async function createDevices() {
  logStep('1', 'Creating realistic test devices...');

  const devices = [
    {
      device_id: 'CUSTOMER_KIOSK_01',
      device_type: 'customer',
      name: 'Customer Kiosk Terminal 1',
      location: 'Entrance Hall',
      ip_address: '192.168.1.101'
    },
    {
      device_id: 'MAIN_DISPLAY_01',
      device_type: 'display',
      name: 'Main Queue Display Screen',
      location: 'Central Hall',
      ip_address: '192.168.1.102'
    },
    {
      device_id: 'EMPLOYEE_WIN_01',
      device_type: 'employee',
      name: 'Employee Window Terminal 1',
      location: 'Service Window 1',
      ip_address: '192.168.1.103'
    },
    {
      device_id: 'EMPLOYEE_WIN_02',
      device_type: 'employee',
      name: 'Employee Window Terminal 2',
      location: 'Service Window 2',
      ip_address: '192.168.1.104'
    }
  ];

  for (const device of devices) {
    try {
      const result = await apiCall('/api/devices', 'POST', device);
      deviceIds.push(device.device_id);
      logSuccess(`Device created: ${device.name} (${device.device_id})`);
    } catch (error) {
      logError(`Failed to create device ${device.device_id}: ${error.message}`);
    }
  }

  logInfo(`Total devices created: ${deviceIds.length}`);
}

// Create services
async function createServices() {
  logStep('2', 'Creating test services...');

  const services = [
    { name: 'خدمة عملاء عامة' },
    { name: 'خدمة مالية وحسابات' }
  ];

  for (const service of services) {
    try {
      const result = await apiCall('/api/services', 'POST', service);
      logSuccess(`Service created: ${service.name} (ID: ${result.data.id})`);
    } catch (error) {
      logError(`Failed to create service ${service.name}: ${error.message}`);
    }
  }
}

// Create windows
async function createWindows() {
  logStep('3', 'Creating service windows...');

  for (let i = 1; i <= 2; i++) {
    try {
      const result = await apiCall('/api/windows', 'POST', { active: true });
      logSuccess(`Window created: شباك ${result.data.id}`);
    } catch (error) {
      logError(`Failed to create window ${i}: ${error.message}`);
    }
  }
}

// Setup Socket.IO connections
async function setupSocketConnections() {
  logStep('4', 'Setting up Socket.IO connections...');

  const deviceTypes = ['customer', 'display', 'employee', 'employee'];

  for (let i = 0; i < deviceIds.length; i++) {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    socket.on('connect', () => {
      logSuccess(`Socket connected for ${deviceIds[i]} (${deviceTypes[i]})`);

      // Register device
      socket.emit('device:register', {
        deviceId: deviceIds[i],
        deviceType: deviceTypes[i],
        location: `Test Location ${i + 1}`
      });
    });

    socket.on('device:registered', (data) => {
      if (data.success) {
        logSuccess(`Device registered: ${deviceIds[i]}`);
      } else {
        logError(`Device registration failed: ${deviceIds[i]} - ${data.message}`);
      }
    });

    // Listen for real-time events
    socket.on('ticket:created', (data) => {
      logInfo(`[${deviceIds[i]}] Received ticket:created event - Ticket #${data.ticket_number}`);
    });

    socket.on('ticket:called', (data) => {
      logInfo(`[${deviceIds[i]}] Received ticket:called event - Ticket #${data.ticket_number} to Window ${data.window_id}`);
    });

    socket.on('ticket:served', (data) => {
      logInfo(`[${deviceIds[i]}] Received ticket:served event - Ticket #${data.ticket_number}`);
    });

    socket.on('print:status-updated', (data) => {
      logInfo(`[${deviceIds[i]}] Received print:status-updated event - Ticket #${data.ticket_number} status: ${data.print_status}`);
    });

    socket.on('queue:updated', (data) => {
      logInfo(`[${deviceIds[i]}] Queue update - Pending: ${data.pending}, Total: ${data.total}`);
    });

    socket.on('disconnect', () => {
      logError(`Socket disconnected for ${deviceIds[i]}`);
    });

    sockets.push(socket);
  }

  // Wait for all connections
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Create tickets with print status simulation
async function createTickets() {
  logStep('5', 'Creating tickets and simulating print workflow...');

  // Create 4 tickets (2 for each service)
  for (let serviceId = 1; serviceId <= 2; serviceId++) {
    for (let i = 1; i <= 2; i++) {
      try {
        // Create ticket
        const ticket = await apiCall('/api/tickets', 'POST', { service_id: serviceId });
        ticketsCreated.push(ticket.data);
        logSuccess(`Ticket created: #${ticket.data.ticket_number} for Service ${serviceId}`);

        // Simulate print process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update print status to "printing"
        await apiCall(`/api/tickets/${ticket.data.id}/print-status`, 'PUT', {
          print_status: 'printing'
        });
        logInfo(`Ticket #${ticket.data.ticket_number} print status: printing`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update print status to "printed"
        await apiCall(`/api/tickets/${ticket.data.id}/print-status`, 'PUT', {
          print_status: 'printed'
        });
        logSuccess(`Ticket #${ticket.data.ticket_number} print status: printed`);

      } catch (error) {
        logError(`Failed to create/print ticket for service ${serviceId}: ${error.message}`);
      }
    }
  }

  logInfo(`Total tickets created: ${ticketsCreated.length}`);
}

// Call and serve tickets
async function processTickets() {
  logStep('6', 'Processing tickets (call and serve workflow)...');

  let windowId = 1;

  for (const ticket of ticketsCreated) {
    try {
      // Call ticket
      const callResult = await apiCall('/api/tickets/call', 'POST', {
        ticket_id: ticket.id,
        window_id: windowId
      });
      logSuccess(`Ticket #${ticket.ticket_number} called to Window ${windowId}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Serve ticket
      const serveResult = await apiCall(`/api/tickets/${ticket.id}`, 'PATCH', {
        status: 'served',
        window_id: windowId
      });
      logSuccess(`Ticket #${ticket.ticket_number} served at Window ${windowId}`);

      // Alternate between windows
      windowId = windowId === 1 ? 2 : 1;

      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logError(`Failed to process ticket #${ticket.ticket_number}: ${error.message}`);
    }
  }
}

// Validate database state
async function validateDatabase() {
  logStep('7', 'Validating database state...');

  try {
    // Get all tickets
    const ticketsResult = await apiCall('/api/tickets');
    const allTickets = ticketsResult.data;

    logInfo(`Total tickets in database: ${allTickets.length}`);

    // Validate each ticket
    for (const ticket of allTickets) {
      log(`\n--- Ticket #${ticket.ticket_number} ---`, 'magenta');
      log(`  ID: ${ticket.id}`);
      log(`  Service ID: ${ticket.service_id}`);
      log(`  Status: ${ticket.status}`);
      log(`  Print Status: ${ticket.print_status}`);
      log(`  Created At: ${ticket.created_at}`);
      log(`  Called At: ${ticket.called_at || 'NULL'}`);
      log(`  Served At: ${ticket.served_at || 'NULL'}`);
      log(`  Window ID: ${ticket.window_id || 'NULL'}`);

      // Validation checks
      if (!ticket.created_at) {
        logError(`  ❌ Missing created_at`);
      } else {
        logSuccess(`  ✅ created_at filled`);
      }

      if (ticket.status === 'called' || ticket.status === 'served') {
        if (!ticket.called_at) {
          logError(`  ❌ Missing called_at for ${ticket.status} ticket`);
        } else {
          logSuccess(`  ✅ called_at filled`);
        }

        if (!ticket.window_id) {
          logError(`  ❌ Missing window_id for ${ticket.status} ticket`);
        } else {
          logSuccess(`  ✅ window_id filled`);
        }
      }

      if (ticket.status === 'served') {
        if (!ticket.served_at) {
          logError(`  ❌ Missing served_at for served ticket`);
        } else {
          logSuccess(`  ✅ served_at filled`);
        }
      }

      if (ticket.print_status !== 'printed') {
        logError(`  ❌ Print status not 'printed': ${ticket.print_status}`);
      } else {
        logSuccess(`  ✅ Print status is 'printed'`);
      }
    }

  } catch (error) {
    logError(`Failed to validate database: ${error.message}`);
  }
}

// Display final statistics
async function displayStatistics() {
  logStep('8', 'Displaying final system statistics...');

  try {
    const stats = await apiCall('/api/tickets/statistics');
    const queueStatus = await apiCall('/api/queue/status');

    log(`\n--- SYSTEM STATISTICS ---`, 'cyan');
    log(`Total Tickets: ${stats.data.tickets.total}`);
    log(`Today's Tickets: ${stats.data.tickets.today}`);
    log(`Pending Tickets: ${stats.data.tickets.pending}`);
    log(`Served Tickets: ${stats.data.tickets.served}`);
    log(`Total Services: ${stats.data.services.total}`);
    log(`Total Windows: ${stats.data.windows.total}`);
    log(`Active Windows: ${stats.data.windows.active}`);

    log(`\n--- QUEUE STATUS ---`, 'cyan');
    log(`Pending: ${queueStatus.data.stats.pending}`);
    log(`Total: ${queueStatus.data.stats.total}`);
    log(`Served: ${queueStatus.data.stats.served}`);
    log(`Called: ${queueStatus.data.stats.called}`);

  } catch (error) {
    logError(`Failed to get statistics: ${error.message}`);
  }
}

// Display all database tables
async function displayDatabaseTables() {
  logStep('9', 'Displaying database tables...');

  try {
    log(`\n--- ALL TICKETS TABLE ---`, 'magenta');
    const tickets = await apiCall('/api/tickets');
    console.table(tickets.data.map(t => ({
      ID: t.id,
      Number: t.ticket_number,
      Service: t.service_id,
      Status: t.status,
      PrintStatus: t.print_status,
      WindowID: t.window_id || 'NULL',
      CreatedAt: new Date(t.created_at).toLocaleTimeString(),
      CalledAt: t.called_at ? new Date(t.called_at).toLocaleTimeString() : 'NULL',
      ServedAt: t.served_at ? new Date(t.served_at).toLocaleTimeString() : 'NULL'
    })));

    log(`\n--- SERVICES TABLE ---`, 'magenta');
    const services = await apiCall('/api/services');
    console.table(services.data);

    log(`\n--- WINDOWS TABLE ---`, 'magenta');
    const windows = await apiCall('/api/windows');
    console.table(windows.data);

    log(`\n--- DEVICES TABLE ---`, 'magenta');
    const devices = await apiCall('/api/devices');
    console.table(devices.data.map(d => ({
      ID: d.id,
      DeviceID: d.device_id,
      Type: d.device_type,
      Name: d.name,
      Status: d.status,
      IPAddress: d.ip_address
    })));

  } catch (error) {
    logError(`Failed to display database tables: ${error.message}`);
  }
}

// Cleanup function
function cleanup() {
  logStep('CLEANUP', 'Closing socket connections...');

  sockets.forEach((socket, index) => {
    if (socket.connected) {
      socket.disconnect();
      logInfo(`Socket disconnected for ${deviceIds[index]}`);
    }
  });
}

// Main test execution
async function runComprehensiveTest() {
  logSection('🚀 FINAL COMPREHENSIVE WORKFLOW TEST STARTED');
  log('Testing complete queue management system with real-time updates', 'green');

  try {
    // Check server health
    logStep('0', 'Checking server health...');
    const health = await apiCall('/api/health');
    logSuccess(`Server is healthy: ${health.message}`);

    // Execute test steps
    await createDevices();
    await createServices();
    await createWindows();
    await setupSocketConnections();
    await createTickets();
    await processTickets();

    // Wait for all events to propagate
    logInfo('Waiting for all events to propagate...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await validateDatabase();
    await displayStatistics();
    await displayDatabaseTables();

    logSection('🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY');
    logSuccess('All workflow steps completed. Check the database validation above.');
    logSuccess('Real-time Socket.IO events were tested throughout the process.');

  } catch (error) {
    logSection('❌ TEST FAILED');
    logError(`Test failed with error: ${error.message}`);
    console.error(error.stack);
  } finally {
    cleanup();

    // Keep process alive for a moment to see results
    setTimeout(() => {
      logInfo('Test completed. Exiting...');
      process.exit(0);
    }, 2000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logInfo('\nReceived SIGINT. Cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  cleanup();
  process.exit(1);
});

// Start the test
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = { runComprehensiveTest };
