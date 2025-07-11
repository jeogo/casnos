import dgram from 'dgram'
import os from 'os'

// 🌐 معلومات الشبكة المكتشفة
interface NetworkInfo {
  ip: string
  subnet: string
  broadcastAddress: string
  networkClass: 'A' | 'B' | 'C'
}

/**
 * UDP Server for broadcasting server discovery information
 * Allows clients to discover the CASNOS server on the network
 */
class UDPServer {
  private socket: dgram.Socket | null = null
  private port: number
  private serverPort: number
  private broadcastInterval: NodeJS.Timeout | null = null

  constructor(port: number = 4000, serverPort: number = 3001) {
    this.port = port
    this.serverPort = serverPort
  }

  // 🔍 دالة ذكية لاكتشاف معلومات الشبكة الكاملة
  private detectNetworkInfo(): NetworkInfo {
    const interfaces = os.networkInterfaces()

    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name]
      if (!nets) continue

      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          const ip = net.address

          if (this.isPrivateNetwork(ip)) {
            const subnet = net.netmask
            const networkClass = this.getNetworkClass(ip)
            const broadcastAddress = this.calculateBroadcastAddress(ip, subnet)

            return {
              ip,
              subnet,
              broadcastAddress,
              networkClass
            }
          }
        }
      }
    }

    throw new Error('No valid private network IP address found')
  }

  // 🔍 فحص ما إذا كان العنوان في شبكة محلية
  private isPrivateNetwork(ip: string): boolean {
    return (
      ip.startsWith('192.168.') ||      // Class C private
      ip.startsWith('10.') ||           // Class A private
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) // Class B private
    )
  }

  // 📊 تحديد فئة الشبكة
  private getNetworkClass(ip: string): 'A' | 'B' | 'C' {
    if (ip.startsWith('10.')) return 'A'
    if (ip.startsWith('172.')) return 'B'
    if (ip.startsWith('192.168.')) return 'C'
    return 'C' // default
  }

  // 🧮 حساب عنوان البث للشبكة
  private calculateBroadcastAddress(ip: string, netmask: string): string {
    const ipParts = ip.split('.').map(Number)
    const maskParts = netmask.split('.').map(Number)

    const broadcastParts = ipParts.map((ipPart, index) => {
      const maskPart = maskParts[index] || 0 // حماية من undefined
      return ipPart | (255 - maskPart)
    })

    return broadcastParts.join('.')
  }

  // 📡 إنشاء قائمة ذكية بعناوين البث
  private generateNetworkAwareBroadcasts(): string[] {
    try {
      const networkInfo = this.detectNetworkInfo()
      const broadcasts = new Set<string>()

      // إضافة البث العام دائماً
      broadcasts.add('255.255.255.255')

      // إضافة عنوان البث للشبكة الحالية
      broadcasts.add(networkInfo.broadcastAddress)

      // إضافة عناوين بث شائعة حسب فئة الشبكة
      if (networkInfo.networkClass === 'A') {
        broadcasts.add('10.255.255.255')
        broadcasts.add('10.0.255.255')
        broadcasts.add('10.10.255.255')
      } else if (networkInfo.networkClass === 'B') {
        broadcasts.add('172.31.255.255')
        broadcasts.add('172.16.255.255')
        broadcasts.add('172.20.255.255')
      } else {
        broadcasts.add('192.168.1.255')
        broadcasts.add('192.168.0.255')
        broadcasts.add('192.168.255.255')
      }

      return Array.from(broadcasts)
    } catch (error) {
      // fallback إلى عناوين شائعة
      return [
        '255.255.255.255',
        '192.168.1.255',
        '192.168.0.255',
        '10.255.255.255',
        '172.31.255.255'
      ]
    }
  }

  /**
   * Get the server's local IP address (updated method)
   */
  private getLocalIPAddress(): string {
    try {
      const networkInfo = this.detectNetworkInfo()
      return networkInfo.ip
    } catch (error) {
      throw new Error('No valid local network IP address found')
    }
  }

  /**
   * Start the UDP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = dgram.createSocket('udp4')

        this.socket.on('error', (error) => {
          console.error('❌ UDP Server error:', error)
          reject(error)
        })

        this.socket.on('message', (msg, rinfo) => {
          this.handleClientMessage(msg, rinfo)
        })

        this.socket.on('listening', () => {
          const address = this.socket?.address()
          console.log(`📡 UDP Server listening on ${address?.address}:${address?.port}`)

          // Enable broadcast
          this.socket?.setBroadcast(true)

          this.startBroadcasting()
          resolve()
        })

        // Bind to the UDP port on all interfaces
        this.socket.bind(this.port, '0.0.0.0')

      } catch (error) {
        console.error('❌ Failed to start UDP server:', error)
        reject(error)
      }
    })
  }

  /**
   * Handle incoming messages from clients
   */
  private handleClientMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const message = JSON.parse(msg.toString())
      console.log(`📨 UDP: Received message from ${rinfo.address}:${rinfo.port}`, message)

      // If it's a discovery request, send immediate response
      if (message.type === 'discovery') {
        console.log(`🔍 UDP: Processing discovery request from ${rinfo.address}:${rinfo.port}`)
        this.sendDiscoveryResponse(rinfo)
      }
    } catch (error) {
      // Ignore invalid messages
      console.log('📨 UDP: Invalid message received, ignoring')
    }
  }

  /**
   * Send discovery response to a specific client
   */
  private sendDiscoveryResponse(rinfo: dgram.RemoteInfo): void {
    const serverIP = this.getLocalIPAddress()

    const response = {
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
    }

    const responseBuffer = Buffer.from(JSON.stringify(response))

    if (this.socket) {
      // Send direct response to the requesting client
      this.socket.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address, (error) => {
        if (error) {
          console.error('Failed to send UDP response:', error)
        } else {
          console.log(`📤 UDP: Sent discovery response to ${rinfo.address}:${rinfo.port}`)
        }
      })
    }
  }

  /**
   * Start broadcasting server information periodically
   */
  private startBroadcasting(): void {
    // Send initial broadcast
    this.sendBroadcast()

    // Set up periodic broadcasts every 30 seconds
    this.broadcastInterval = setInterval(() => {
      this.sendBroadcast()
    }, 30000)
  }

  /**
   * Send broadcast message to the network
   */
  private sendBroadcast(): void {
    const serverIP = this.getLocalIPAddress()

    const broadcastMessage = {
      type: 'server_broadcast',
      timestamp: Date.now(),
      data: {
        serverInfo: 'CASNOS Queue Management Server',
        version: '1.0.0',
        server: {
          ip: serverIP,
          port: this.serverPort,
          udpPort: this.port,
          apiUrl: `http://${serverIP}:${this.serverPort}`,
          socketUrl: `http://${serverIP}:${this.serverPort}`
        }
      }
    }

    const messageBuffer = Buffer.from(JSON.stringify(broadcastMessage))

    if (this.socket) {
      // Make sure broadcast is enabled
      this.socket.setBroadcast(true)

      // Broadcast to multiple addresses for better coverage
      const broadcastAddresses = this.generateNetworkAwareBroadcasts()

      console.log(`📡 UDP: Smart broadcasting to ${broadcastAddresses.length} addresses:`, broadcastAddresses)

      broadcastAddresses.forEach(address => {
        this.socket?.send(messageBuffer, 0, messageBuffer.length, this.port, address, (error) => {
          if (error) {
            console.error(`❌ Failed to send UDP broadcast to ${address}:`, error.message)
          } else {
            console.log(`📡 UDP: Broadcast sent to ${address}`)
          }
        })
      })
    }
  }

  /**
   * Stop the UDP server
   */
  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }

    if (this.socket) {
      this.socket.close(() => {
        console.log('📡 UDP Server stopped')
      })
      this.socket = null
    }
  }
}

// Create and export the UDP server instance
export const udpServer = new UDPServer(4000, 3001)
export default udpServer
