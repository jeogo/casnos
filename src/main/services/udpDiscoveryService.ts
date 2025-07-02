// 📡 UDP Discovery Service - خدمة اكتشاف UDP
import dgram from 'dgram';

// متغيرات الخادم العامة
let discoveredServerIp: string | null = null;
let discoveredServerPort: number = 3001;
let udpSocket: dgram.Socket | null = null;
let discoveryInterval: NodeJS.Timeout | null = null;

// دوال للوصول للمتغيرات من خارج الوحدة
export function getDiscoveredServerInfo() {
  return { ip: discoveredServerIp, port: discoveredServerPort };
}

export function isServerDiscovered(): boolean {
  return discoveredServerIp !== null;
}

// Update discovered server info manually (called from networkHandlers)
export function updateDiscoveredServerInfo(ip: string, port: number) {
  discoveredServerIp = ip;
  discoveredServerPort = port;
  console.log(`[UDP CLIENT] Server info updated manually: ${ip}:${port}`);
}

// Initialize UDP discovery when Electron is ready
export function initializeUDPDiscovery() {
  // Clean up existing socket if any
  if (udpSocket) {
    udpSocket.close();
  }

  udpSocket = dgram.createSocket('udp4');

  udpSocket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log('[UDP CLIENT] Received message:', JSON.stringify(data), 'from', rinfo.address + ':' + rinfo.port);

      // Check for server discovery response with correct data structure
      if (data && data.type === 'discovery' && data.data && data.data.server) {
        const serverData = data.data.server;
        if (serverData.ip && serverData.port) {
          discoveredServerIp = serverData.ip;
          discoveredServerPort = serverData.port;
          console.log(`[UDP CLIENT] ✅ Server discovered at ${discoveredServerIp}:${discoveredServerPort}`);

          // Stop discovery requests once server is found
          if (discoveryInterval) {
            clearInterval(discoveryInterval);
            discoveryInterval = null;
          }
        }
      }
    } catch (e) {
      console.log('[UDP CLIENT] Failed to parse message:', e);
    }
  });

  udpSocket.on('error', (err) => {
    console.error('[UDP CLIENT] Socket error:', err.message);
    // Try to restart UDP discovery after error
    setTimeout(() => {
      if (!discoveredServerIp) {
        initializeUDPDiscovery();
      }
    }, 5000);
  });

  udpSocket.on('listening', () => {
    const address = udpSocket?.address();
    console.log(`[UDP CLIENT] 📡 Listening on ${address?.address}:${address?.port}`);
    udpSocket?.setBroadcast(true);

    // Start sending discovery requests
    sendDiscoveryRequest();

    // Send discovery request periodically until server is found
    discoveryInterval = setInterval(() => {
      if (discoveredServerIp) {
        if (discoveryInterval) {
          clearInterval(discoveryInterval);
          discoveryInterval = null;
        }
      } else {
        sendDiscoveryRequest();
      }
    }, 3000); // Every 3 seconds
  });

  // Bind to a random available port (let system choose)
  udpSocket.bind(0, '0.0.0.0');
}

function sendDiscoveryRequest() {
  if (!udpSocket) return;

  const discoveryMessage = {
    type: 'discovery',
    timestamp: Date.now(),
    data: {
      clientInfo: {
        type: 'electron-client',
        version: '1.0.0',
        platform: process.platform,
        requestId: Math.random().toString(36).substr(2, 9)
      }
    }
  };

  const messageBuffer = Buffer.from(JSON.stringify(discoveryMessage));

  // Send to server's UDP port (4000) with broadcast
  udpSocket.send(messageBuffer, 0, messageBuffer.length, 4000, '255.255.255.255', (error) => {
    if (error) {
      console.error('[UDP CLIENT] Failed to send discovery request:', error.message);
    } else {
      console.log('[UDP CLIENT] 📡 Discovery request sent to broadcast (server port 4000)');
    }
  });
}

// تنظيف الموارد عند إغلاق التطبيق
export function cleanupUDPDiscovery() {
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
    discoveryInterval = null;
  }
  if (udpSocket) {
    udpSocket.close();
    udpSocket = null;
  }
  console.log('[UDP CLIENT] 🧹 Resources cleaned up');
}
