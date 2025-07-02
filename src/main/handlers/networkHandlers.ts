// 🌐 Network Handlers - معالجات الشبكة
import { ipcMain } from 'electron'
import dgram from 'dgram';
import os from 'os';

// متغيرات الشبكة العامة
let discoveredServerIp: string | null = null;
let discoveredServerPort: number = 3001;

// دالة لتحديث معلومات الخادم
export function updateNetworkServerInfo(ip: string | null, port: number) {
  discoveredServerIp = ip;
  discoveredServerPort = port;
}

// دالة للحصول على معلومات الخادم
export function getNetworkServerInfo() {
  return { ip: discoveredServerIp, port: discoveredServerPort };
}

// Get MAC address utility function
function getMACAddress(): string | null {
  try {
    const networkInterfaces = os.networkInterfaces();

    // Look for the first non-internal network interface with MAC address
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (!interfaces) continue;

      for (const interfaceInfo of interfaces) {
        // Skip internal (loopback) interfaces and those without MAC addresses
        if (!interfaceInfo.internal && interfaceInfo.mac && interfaceInfo.mac !== '00:00:00:00:00:00') {
          return interfaceInfo.mac;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[MAIN] Error getting MAC address:', error);
    return null;
  }
}

export function setupNetworkHandlers() {
  // IPC handler for UDP server discovery
  ipcMain.handle('discover-server-udp', async (_event) => {
    return new Promise((resolve) => {
      const udpSocket = dgram.createSocket('udp4');
      const discoveryPort = 4000; // Server's UDP port
      const timeout = 5000; // 5 seconds timeout
      let resolved = false;

      // Timeout handler
      const timeoutHandler = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          udpSocket.close();
          console.log('[UDP-DISCOVERY] ⏰ Discovery timeout - no server found');
          resolve(null);
        }
      }, timeout);

      // Message handler
      udpSocket.on('message', (msg, rinfo) => {
        if (resolved) return;

        try {
          const message = JSON.parse(msg.toString());
          console.log('[UDP-DISCOVERY] 📨 Received response from:', rinfo.address, message);

          if (message.type === 'discovery' && message.data?.serverInfo && message.data?.server) {
            resolved = true;
            clearTimeout(timeoutHandler);
            udpSocket.close();

            const serverInfo = {
              ip: message.data.server.ip,
              port: message.data.server.port,
              apiUrl: message.data.server.apiUrl,
              socketUrl: message.data.server.socketUrl,
              version: message.data.version
            };

            console.log('[UDP-DISCOVERY] ✅ Server discovered:', serverInfo);

            // Update global server info
            updateNetworkServerInfo(serverInfo.ip, serverInfo.port);

            resolve(serverInfo);
          }
        } catch (error) {
          console.error('[UDP-DISCOVERY] Error parsing message:', error);
        }
      });

      udpSocket.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandler);
          console.error('[UDP-DISCOVERY] Socket error:', error);
          resolve(null);
        }
      });

      // Bind and send discovery request
      udpSocket.bind(() => {
        udpSocket.setBroadcast(true);

        const discoveryMessage = {
          type: 'discovery',
          timestamp: Date.now(),
          data: {
            clientInfo: {
              type: 'casnos-client',
              version: '1.0.0',
              platform: process.platform,
              nodeVersion: process.version
            }
          }
        };

        const messageBuffer = Buffer.from(JSON.stringify(discoveryMessage));

        // Broadcast to common network ranges
        const broadcastAddresses = [
          '255.255.255.255',  // Global broadcast
          '192.168.1.255',    // 192.168.1.x subnet
          '192.168.0.255',    // 192.168.0.x subnet
          '10.255.255.255',   // 10.x.x.x subnet
          '172.31.255.255'    // 172.16-31.x.x subnet
        ];

        console.log('[UDP-DISCOVERY] 🔍 Broadcasting discovery request...');

        broadcastAddresses.forEach(broadcast => {
          udpSocket.send(messageBuffer, discoveryPort, broadcast, (error) => {
            if (error) {
              console.error(`[UDP-DISCOVERY] Failed to broadcast to ${broadcast}:`, error.message);
            } else {
              console.log(`[UDP-DISCOVERY] 📡 Broadcast sent to ${broadcast}:${discoveryPort}`);
            }
          });
        });
      });
    });
  });

  // IPC handler to listen for UDP signals (legacy support)
  ipcMain.handle('listen-udp', async (_event, port: number) => {
    const udpSocket = dgram.createSocket('udp4');
    udpSocket.bind(port);
    return true;
  });

  // IPC handler to connect to socket.io server
  ipcMain.handle('connect-socket', async (_event, _serverUrl: string, _options?: any) => {
    // This is a placeholder. In practice, you may want to manage socket connections in main and communicate events back to renderer.
    // For now, just acknowledge the request.
    return true;
  });

  // IPC handler to get socket.io server IP and port
  ipcMain.handle('get-socket-server-ip', async () => {
    return { ip: discoveredServerIp, port: discoveredServerPort };
  });

  // IPC handler to get server info (unified method)
  ipcMain.handle('get-server-info', async () => {
    if (discoveredServerIp) {
      return { ip: discoveredServerIp, port: discoveredServerPort };
    }
    return null;
  });

  // IPC handler to get MAC address
  ipcMain.handle('get-mac-address', async () => {
    try {
      const macAddress = getMACAddress();
      return macAddress;
    } catch (error) {
      console.error('[ELECTRON] Error in get-mac-address handler:', error);
      return null;
    }
  });

  // IPC handler to get device network info (IP + MAC)
  ipcMain.handle('get-device-network-info', async () => {
    try {
      const macAddress = getMACAddress();
      const networkInterfaces = os.networkInterfaces();

      // Try to get local IP address - NEVER use localhost
      let ipAddress = '192.168.1.100'; // Default network IP instead of localhost
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (!interfaces) continue;

        for (const interfaceInfo of interfaces) {
          if (!interfaceInfo.internal && interfaceInfo.family === 'IPv4') {
            // Prefer private network addresses
            const ip = interfaceInfo.address;
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) {
              ipAddress = ip;
              break;
            }
          }
        }
      }

      return {
        ipAddress,
        macAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[ELECTRON] Error in get-device-network-info handler:', error);
      return {
        ipAddress: '192.168.1.100', // Network IP instead of localhost
        macAddress: null,
        timestamp: new Date().toISOString()
      };
    }
  });

  // IPC handler to update server info from renderer process
  ipcMain.handle('update-server-info', async (_event, serverInfo: { ip: string; port: number }) => {
    if (serverInfo && serverInfo.ip && serverInfo.port) {
      updateNetworkServerInfo(serverInfo.ip, serverInfo.port);
      console.log(`[NETWORK] Server info updated from renderer: ${serverInfo.ip}:${serverInfo.port}`);

      // Also update UDP discovery service
      try {
        const udpService = require('../services/udpDiscoveryService');
        if (udpService.updateDiscoveredServerInfo) {
          udpService.updateDiscoveredServerInfo(serverInfo.ip, serverInfo.port);
        }
      } catch (error) {
        // UDP service may not have this method yet
      }

      return { success: true };
    }
    return { success: false, message: 'Invalid server info' };
  });

  console.log('[HANDLERS] 🌐 Network handlers registered successfully');
}
