// 🧪 Test UDP Smart Broadcasting System
// Tests the smart UDP broadcasting functionality for all network types

const dgram = require('dgram');
const os = require('os');

console.log('🚀 Starting UDP Smart Broadcasting Test...\n');

// 🌐 معلومات الشبكة المكتشفة
function detectNetworkInfo() {
  const networkInterfaces = os.networkInterfaces();

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    if (!interfaces) continue;

    for (const interfaceInfo of interfaces) {
      if (!interfaceInfo.internal && interfaceInfo.family === 'IPv4') {
        const ip = interfaceInfo.address;

        // التحقق من أن العنوان في شبكة محلية صالحة
        if (isPrivateNetwork(ip)) {
          const subnet = interfaceInfo.netmask;
          const networkClass = getNetworkClass(ip);
          const broadcastAddress = calculateBroadcastAddress(ip, subnet);

          return {
            ip,
            subnet,
            broadcastAddress,
            networkClass
          };
        }
      }
    }
  }

  throw new Error('No valid private network IP address found');
}

// 🔍 فحص ما إذا كان العنوان في شبكة محلية
function isPrivateNetwork(ip) {
  return (
    ip.startsWith('192.168.') ||      // Class C private
    ip.startsWith('10.') ||           // Class A private
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) // Class B private
  );
}

// 📊 تحديد فئة الشبكة
function getNetworkClass(ip) {
  if (ip.startsWith('10.')) return 'A';
  if (ip.startsWith('172.')) return 'B';
  if (ip.startsWith('192.168.')) return 'C';
  return 'C'; // default
}

// 🧮 حساب عنوان البث للشبكة
function calculateBroadcastAddress(ip, netmask) {
  const ipParts = ip.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  const broadcastParts = ipParts.map((ipPart, index) => {
    const maskPart = maskParts[index] || 0; // حماية من undefined
    return ipPart | (255 - maskPart);
  });

  return broadcastParts.join('.');
}

// 📡 إنشاء قائمة ذكية بعناوين البث
function generateSmartBroadcasts() {
  try {
    const networkInfo = detectNetworkInfo();
    const broadcasts = new Set();

    // إضافة البث العام دائماً
    broadcasts.add('255.255.255.255');

    // إضافة عنوان البث للشبكة الحالية
    broadcasts.add(networkInfo.broadcastAddress);

    // إضافة عناوين بث شائعة حسب فئة الشبكة
    if (networkInfo.networkClass === 'A') {
      // شبكات Class A (10.x.x.x)
      broadcasts.add('10.255.255.255');
      broadcasts.add('10.0.255.255');
      broadcasts.add('10.10.255.255');
    } else if (networkInfo.networkClass === 'B') {
      // شبكات Class B (172.16-31.x.x)
      broadcasts.add('172.31.255.255');
      broadcasts.add('172.16.255.255');
      broadcasts.add('172.20.255.255');
    } else {
      // شبكات Class C (192.168.x.x)
      broadcasts.add('192.168.1.255');
      broadcasts.add('192.168.0.255');
      broadcasts.add('192.168.255.255');
    }

    return Array.from(broadcasts);
  } catch (error) {
    console.error('❌ Error generating smart broadcasts:', error);
    // fallback إلى عناوين شائعة
    return [
      '255.255.255.255',
      '192.168.1.255',
      '192.168.0.255',
      '10.255.255.255',
      '172.31.255.255'
    ];
  }
}

// اختبار اكتشاف الشبكة
function testNetworkDiscovery() {
  console.log('🔍 Testing Network Discovery...');

  try {
    const networkInfo = detectNetworkInfo();
    console.log('✅ Network Info:');
    console.log(`   📍 IP Address: ${networkInfo.ip}`);
    console.log(`   🌐 Subnet Mask: ${networkInfo.subnet}`);
    console.log(`   📡 Broadcast Address: ${networkInfo.broadcastAddress}`);
    console.log(`   🏷️  Network Class: ${networkInfo.networkClass}`);

    const broadcasts = generateSmartBroadcasts();
    console.log(`✅ Generated ${broadcasts.length} smart broadcast addresses:`);
    broadcasts.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr}`);
    });

    return { success: true, networkInfo, broadcasts };
  } catch (error) {
    console.log('❌ Network Discovery Failed:', error.message);
    return { success: false, error: error.message };
  }
}

// اختبار UDP Discovery
function testUDPDiscovery() {
  return new Promise((resolve) => {
    console.log('\n📡 Testing UDP Discovery...');

    const client = dgram.createSocket('udp4');
    let serverFound = false;
    let responses = [];

    const timeout = setTimeout(() => {
      if (!serverFound) {
        console.log('⏰ UDP Discovery timeout (10 seconds)');
        client.close();
        resolve({ success: false, responses, reason: 'timeout' });
      }
    }, 10000);

    client.on('message', (msg, rinfo) => {
      try {
        const response = JSON.parse(msg.toString());
        console.log(`📨 Received response from ${rinfo.address}:${rinfo.port}`);
        console.log(`   Type: ${response.type}`);

        if (response.data && response.data.server) {
          console.log(`   ✅ Server IP: ${response.data.server.ip}`);
          console.log(`   ✅ Server Port: ${response.data.server.port}`);
          serverFound = true;
          responses.push({ ...response, from: rinfo });
        }
      } catch (e) {
        console.log(`❌ Invalid response from ${rinfo.address}:${rinfo.port}`);
      }
    });

    client.on('error', (err) => {
      console.log('❌ UDP Client Error:', err.message);
      clearTimeout(timeout);
      resolve({ success: false, error: err.message, responses });
    });

    client.bind(() => {
      client.setBroadcast(true);

      const discoveryMessage = {
        type: 'discovery',
        timestamp: Date.now()
      };

      const messageBuffer = Buffer.from(JSON.stringify(discoveryMessage));
      const broadcasts = generateSmartBroadcasts();

      console.log(`📤 Sending discovery to ${broadcasts.length} broadcast addresses...`);

      broadcasts.forEach((broadcast, index) => {
        setTimeout(() => {
          client.send(messageBuffer, 4000, broadcast, (err) => {
            if (err) {
              console.log(`❌ Failed to send to ${broadcast}: ${err.message}`);
            } else {
              console.log(`✅ Discovery sent to ${broadcast}`);
            }
          });
        }, index * 100); // تأخير صغير بين الإرسالات
      });

      // انتظار لمدة 5 ثوان إضافية للاستجابات
      setTimeout(() => {
        clearTimeout(timeout);
        client.close();

        if (responses.length > 0) {
          console.log(`✅ UDP Discovery successful! Found ${responses.length} server(s)`);
          resolve({ success: true, responses });
        } else {
          console.log('❌ No server responses received');
          resolve({ success: false, responses, reason: 'no_responses' });
        }
      }, 8000);
    });
  });
}

// تشغيل جميع الاختبارات
async function runAllTests() {
  console.log('=' .repeat(80));
  console.log('🧪 CASNOS UDP Smart Broadcasting Test Suite');
  console.log('=' .repeat(80));

  // اختبار اكتشاف الشبكة
  const networkTest = testNetworkDiscovery();

  if (!networkTest.success) {
    console.log('\n❌ Network discovery failed, cannot proceed with UDP tests');
    process.exit(1);
  }

  // اختبار UDP Discovery
  const udpTest = await testUDPDiscovery();

  // تقرير نهائي
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(80));
  console.log(`🌐 Network Discovery: ${networkTest.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`📡 UDP Discovery: ${udpTest.success ? '✅ PASSED' : '❌ FAILED'}`);

  if (networkTest.success) {
    console.log(`📍 Current Network: ${networkTest.networkInfo.ip} (Class ${networkTest.networkInfo.networkClass})`);
    console.log(`📡 Smart Broadcasts: ${networkTest.broadcasts.length} addresses`);
  }

  if (udpTest.success) {
    console.log(`🎯 Servers Found: ${udpTest.responses.length}`);
    udpTest.responses.forEach((resp, i) => {
      console.log(`   ${i + 1}. ${resp.data.server.ip}:${resp.data.server.port} (from ${resp.from.address})`);
    });
  } else {
    console.log(`❌ UDP Discovery Failed: ${udpTest.reason || udpTest.error || 'Unknown error'}`);
  }

  const allPassed = networkTest.success && udpTest.success;
  console.log('\n🏁 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('=' .repeat(80));

  process.exit(allPassed ? 0 : 1);
}

// تشغيل الاختبارات
runAllTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
