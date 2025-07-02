import dgram from 'dgram';
import os from 'os';
// logger removed
import { Device } from '../types/device';

export interface UDPMessage {
  type: 'discovery' | 'heartbeat' | 'status' | 'command' | 'response';
  deviceId?: string;
  data?: any;
  timestamp: number;
}

export interface DiscoveredDevice {
  deviceId: string;
  ip: string;
  port: number;
  lastSeen: number;
  deviceInfo: Device;
}

/**
 * الحصول على عنوان IP الفعلي للخادم في الشبكة المحلية
 * يدعم جميع أنواع الشبكات: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
 */
function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();

  // البحث عن أول IP صالح في الشبكة المحلية
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      // تجاهل العناوين الداخلية (loopback) والـ IPv6
      if (net.family === 'IPv4' && !net.internal) {
        // التحقق من أن العنوان في شبكة محلية صالحة
        const ip = net.address;
        if (
          ip.startsWith('192.168.') ||      // Class C private
          ip.startsWith('10.') ||           // Class A private
          /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) // Class B private
        ) {
          return ip;
        }
      }
    }
  }

  // إذا لم نجد IP محلي، استخدم IP شبكة افتراضي بدلاً من localhost
  // No logger: just fallback silently
  return '192.168.1.1'; // Network IP instead of localhost
}

class UDPCommunication {
  private server: dgram.Socket;
  private port: number;
  private serverPort: number; // منفذ الخادم الرئيسي (API)
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 4000, serverPort: number = 3001) {
    this.port = port; // منفذ UDP
    this.serverPort = serverPort; // منفذ API/Socket
    this.server = dgram.createSocket('udp4');
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.server.on('listening', () => {});

    this.server.on('message', (msg, rinfo) => {
      try {
        const message: UDPMessage = JSON.parse(msg.toString());
        this.handleMessage(message, rinfo);
      } catch (error) {
        // Ignore parse errors silently
      }
    });

    this.server.on('error', (error) => {});

    this.server.on('close', () => {
      if (this.broadcastInterval) {
        clearInterval(this.broadcastInterval);
        this.broadcastInterval = null;
      }
    });
  }

  private handleMessage(message: UDPMessage, rinfo: dgram.RemoteInfo): void {
    switch (message.type) {
      case 'discovery':
        this.handleDiscoveryRequest(message, rinfo);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message, rinfo);
        break;
      case 'status':
        this.handleStatusUpdate(message, rinfo);
        break;
      case 'response':
        this.handleResponse(message, rinfo);
        break;
      default:
        // Ignore unknown message types silently
    }
  }

  private handleDiscoveryRequest(message: UDPMessage, rinfo: dgram.RemoteInfo): void {
    // Check if this is a client discovery request
    if (message.data?.clientInfo) {
      // Send direct response to the client
      this.sendDiscoveryResponse(rinfo);
    } else {
      // Ignore
    }
  }

  private sendDiscoveryResponse(rinfo: dgram.RemoteInfo): void {
    const serverIP = getLocalIPAddress();

    const response: UDPMessage = {
      type: 'discovery',
      timestamp: Date.now(),
      data: {
        serverInfo: 'CASNOS Queue Management Server',
        version: '1.0.0',
        server: {
          ip: serverIP,
          port: this.serverPort,
          udpPort: this.port,
          apiUrl: `http://${serverIP}:${this.serverPort}`,
          socketUrl: `http://${serverIP}:${this.serverPort}`,
          endpoints: {
            api: `http://${serverIP}:${this.serverPort}/api`,
            health: `http://${serverIP}:${this.serverPort}/health`,
            services: `http://${serverIP}:${this.serverPort}/api/services`,
            tickets: `http://${serverIP}:${this.serverPort}/api/tickets`
          }
        }
      }
    };

    const responseBuffer = Buffer.from(JSON.stringify(response));

    // Send direct response to the client (not broadcast)
    this.server.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address, (error) => {
      // Ignore send errors silently
    });
  }

  private handleHeartbeat(message: UDPMessage, rinfo: dgram.RemoteInfo): void {
    if (!message.deviceId) {
      return;
    }    const deviceInfo: Device = {
      id: 0, // Will be set by database
      device_id: message.deviceId,
      name: message.data?.name || `Device-${message.deviceId}`,
      device_type: message.data?.device_type || 'display',
      ip_address: rinfo.address,
      port: rinfo.port,
      status: 'online',
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      capabilities: JSON.stringify(message.data?.capabilities || ['display']),
      metadata: JSON.stringify({ version: message.data?.version || '1.0.0' })
    };

    const device: DiscoveredDevice = {
      deviceId: message.deviceId,
      ip: rinfo.address,
      port: rinfo.port,
      lastSeen: Date.now(),
      deviceInfo
    };

    this.discoveredDevices.set(message.deviceId, device);

    // Device heartbeat handled
  }

  private handleStatusUpdate(message: UDPMessage, rinfo: dgram.RemoteInfo): void {
    if (!message.deviceId) {
      return;
    }

    const device = this.discoveredDevices.get(message.deviceId);
    if (device) {
      device.lastSeen = Date.now();
      if (message.data) {
        device.deviceInfo = { ...device.deviceInfo, ...message.data };
      }

      // Device status updated
    }
  }

  private handleResponse(message: UDPMessage, rinfo: dgram.RemoteInfo): void {
    // Response handled
  }
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on('error', (error) => {
        reject(error);
      });

      this.server.bind(this.port, '0.0.0.0', () => {
        this.startDiscoveryBroadcast();
        resolve();
      });
    });
  }

  private startDiscoveryBroadcast(): void {
    // Send initial discovery broadcast
    this.sendDiscoveryBroadcast();

    // Set up periodic discovery broadcasts every 30 seconds
    this.broadcastInterval = setInterval(() => {
      this.sendDiscoveryBroadcast();
      this.cleanupOldDevices();
    }, 30000);
  }

  private sendDiscoveryBroadcast(): void {
    const serverIP = getLocalIPAddress();

    const message: UDPMessage = {
      type: 'discovery',
      timestamp: Date.now(),
      data: {
        serverInfo: 'CASNOS Queue Management Server',
        version: '1.0.0',
        // معلومات الاتصال الكاملة للعملاء
        server: {
          ip: serverIP,
          port: this.serverPort,
          udpPort: this.port,
          apiUrl: `http://${serverIP}:${this.serverPort}`,
          socketUrl: `http://${serverIP}:${this.serverPort}`,
          endpoints: {
            api: `http://${serverIP}:${this.serverPort}/api`,
            health: `http://${serverIP}:${this.serverPort}/health`,
            services: `http://${serverIP}:${this.serverPort}/api/services`,
            tickets: `http://${serverIP}:${this.serverPort}/api/tickets`
          }
        },
        network: {
          broadcast: '255.255.255.255',
          subnet: serverIP.split('.').slice(0, 3).join('.') + '.0/24'
        }
      }
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Broadcast to the network
    this.server.setBroadcast(true);
    this.server.send(messageBuffer, 0, messageBuffer.length, this.port, '255.255.255.255', (error) => {
      // Ignore broadcast errors silently
    });
  }

  private cleanupOldDevices(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout

    for (const [deviceId, device] of this.discoveredDevices.entries()) {
      if (now - device.lastSeen > timeout) {
        this.discoveredDevices.delete(deviceId);
      }
    }
  }

  public sendCommand(deviceId: string, command: any): Promise<boolean> {
    return new Promise((resolve) => {
      const device = this.discoveredDevices.get(deviceId);
      if (!device) {
        resolve(false);
        return;
      }

      const message: UDPMessage = {
        type: 'command',
        deviceId,
        timestamp: Date.now(),
        data: command
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      this.server.send(messageBuffer, 0, messageBuffer.length, device.port, device.ip, (error) => {
        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public getDeviceById(deviceId: string): DiscoveredDevice | undefined {
    return this.discoveredDevices.get(deviceId);
  }

  public pingDevice(ip: string, port: number = this.port): Promise<boolean> {
    return new Promise((resolve) => {
      const message: UDPMessage = {
        type: 'discovery',
        timestamp: Date.now()
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.server.send(messageBuffer, 0, messageBuffer.length, port, ip, (error) => {
        clearTimeout(timeout);
        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.server.close(() => {});
  }
}

export const udpCommunication = new UDPCommunication(
  parseInt(process.env.UDP_PORT || '4000', 10), // منفذ UDP
  parseInt(process.env.PORT || '3001', 10)       // منفذ الخادم الرئيسي
);
export default udpCommunication;
