# CASNOS Queue System Test Suite

This test suite simulates different device types connecting to the CASNOS queue management system.

## Test Files

### 1. `admin-device-test.js`
- **Purpose**: Simulates admin dashboard
- **Features**:
  - Creates services
  - Monitors all system activities
  - Gets system statistics
  - Manages daily resets
  - Receives all real-time events

### 2. `customer-device-test.js`
- **Purpose**: Simulates customer kiosk
- **Features**:
  - Takes tickets for services
  - Views queue status
  - Listens for ticket calls
  - Simulates customer interactions

### 3. `employee-device-test.js`
- **Purpose**: Simulates employee terminal
- **Features**:
  - Calls next tickets
  - Marks tickets as served
  - Manages window assignments
  - Processes queue workflow

### 4. `display-device-test.js`
- **Purpose**: Simulates display screen
- **Features**:
  - Shows called ticket information
  - Displays queue status
  - Updates in real-time
  - Shows recent tickets

### 🌐 Network Tests
- **UDP Broadcast** - Discovery and communication
- **TCP Connections** - Direct device communication
- **Network Scanning** - Automatic server discovery
- **LAN Connectivity** - Multi-device network testing

### 🎭 Queue System Simulation
- **Complete Workflow** - End-to-end queue operations
- **Service Creation** - Arabic service names
- **Ticket Processing** - Full ticket lifecycle
- **Multi-device Scenario** - Realistic usage patterns

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- CASNOS server running on `192.168.1.4:3001`

### Run All Tests
```bash
# Windows
run-tests.bat

# Or manually
npm install socket.io-client
node comprehensive-test.js
```

### Individual Test Files

#### 1. Comprehensive Test (`comprehensive-test.js`)
```bash
node comprehensive-test.js
```
- Tests all API endpoints
- Simulates complete queue system
- Generates detailed report

#### 2. Socket.IO Test (`socket-test.js`)
```bash
node socket-test.js
```
- Tests real-time communication
- Device registration scenarios
- Admin and user events

#### 3. Network Test (`network-test.js`)
```bash
node network-test.js
```
- UDP/TCP communication
- Network discovery
- Keep running to monitor broadcasts

## 📊 Test Results

Results are saved to `test-results.json` with:
- Timestamp
- Success/failure counts
- Detailed error messages
- Performance metrics

## 🔧 Configuration

Edit test files to change:
- Server URL: `192.168.1.4:3001`
- UDP/TCP ports
- Test timeouts
- Network ranges

## 📱 Tested Device Types

### Customer Devices
- Queue number generation
- Service selection
- Ticket printing

### Employee Devices
- Ticket calling
- Service management
- Queue control

### Display Devices
- Real-time updates
- Queue visualization
- Announcements

### Admin Devices
- System monitoring
- Statistics
- Device management

## 🌍 Network Features

### LAN Ready
- Multi-device support
- Automatic discovery
- Broadcast communication

### Arabic Support
- Service names in Arabic
- Employee names in Arabic
- Queue announcements

## 📝 Test Scenarios

### 1. Service Creation
```javascript
{
  name: 'خدمة اختبار',
  number_start: 1,
  number_end: 100,
  counter_start: 1,
  counter_end: 5
}
```

### 2. Employee Setup
```javascript
{
  name: 'موظف الاختبار',
  position: 'خدمة العملاء',
  active: true
}
```

### 3. Device Registration
```javascript
{
  device_id: 'QUEUE_TEST_001',
  name: 'جهاز الاختبار',
  ip_address: '192.168.1.200',
  device_type: 'customer'
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check server is running
   - Verify IP address `192.168.1.4`
   - Check port `3001`

2. **Socket.IO Connection Failed**
   - Verify WebSocket support
   - Check firewall settings
   - Try polling transport

3. **UDP/TCP Tests Fail**
   - Check port availability
   - Verify network configuration
   - Test local firewall

### Debug Mode
Add `DEBUG=*` environment variable for detailed logs.

## 📈 Performance Metrics

Tests measure:
- Response times
- Connection establishment
- Data transfer rates
- Error rates
- Success percentages

## 🔄 Continuous Testing

For automated testing:
1. Run `run-tests.bat` in CI/CD
2. Check exit codes
3. Parse `test-results.json`
4. Generate reports

## 📞 Support

For issues or questions:
- Check server logs
- Review test output
- Verify network connectivity
- Test individual components

---

**نظام طوابير CASNOS** - Professional Queue Management System
