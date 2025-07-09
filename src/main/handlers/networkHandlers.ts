// 🌐 Network Handlers - معالجات الشبكة
import { ipcMain } from 'electron'
import dgram from 'dgram'
import os from 'os'
import crypto from 'crypto'

// متغيرات الشبكة العامة
let discoveredServerIp: string | null = null
let discoveredServerPort: number = 3001

// دالة لتحديث معلومات الخادم
export function updateNetworkServerInfo(ip: string | null, port: number) {
  discoveredServerIp = ip
  discoveredServerPort = port
}

// دالة للحصول على معلومات الخادم
export function getNetworkServerInfo() {
  return { ip: discoveredServerIp, port: discoveredServerPort }
}

// 🌐 معلومات الشبكة المكتشفة
interface NetworkInfo {
  ip: string
  subnet: string
  broadcastAddress: string
  networkClass: 'A' | 'B' | 'C'
}

// 🔍 دالة ذكية لاكتشاف معلومات الشبكة الكاملة
function detectNetworkInfo(): NetworkInfo {
  const networkInterfaces = os.networkInterfaces()

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName]
    if (!interfaces) continue

    for (const interfaceInfo of interfaces) {
      if (!interfaceInfo.internal && interfaceInfo.family === 'IPv4') {
        const ip = interfaceInfo.address

        // التحقق من أن العنوان في شبكة محلية صالحة
        if (isPrivateNetwork(ip)) {
          const subnet = interfaceInfo.netmask
          const networkClass = getNetworkClass(ip)
          const broadcastAddress = calculateBroadcastAddress(ip, subnet)

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
function isPrivateNetwork(ip: string): boolean {
  return (
    ip.startsWith('192.168.') ||      // Class C private
    ip.startsWith('10.') ||           // Class A private
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) // Class B private
  )
}

// 📊 تحديد فئة الشبكة
function getNetworkClass(ip: string): 'A' | 'B' | 'C' {
  if (ip.startsWith('10.')) return 'A'
  if (ip.startsWith('172.')) return 'B'
  if (ip.startsWith('192.168.')) return 'C'
  return 'C' // default
}

// 🧮 حساب عنوان البث للشبكة
function calculateBroadcastAddress(ip: string, netmask: string): string {
  const ipParts = ip.split('.').map(Number)
  const maskParts = netmask.split('.').map(Number)

  const broadcastParts = ipParts.map((ipPart, index) => {
    const maskPart = maskParts[index] || 0 // حماية من undefined
    return ipPart | (255 - maskPart)
  })

  return broadcastParts.join('.')
}

// 📡 إنشاء قائمة ذكية بعناوين البث
function generateSmartBroadcasts(): string[] {
  try {
    const networkInfo = detectNetworkInfo()
    const broadcasts = new Set<string>()

    // إضافة البث العام دائماً
    broadcasts.add('255.255.255.255')

    // إضافة عنوان البث للشبكة الحالية
    broadcasts.add(networkInfo.broadcastAddress)

    // إضافة عناوين بث شائعة حسب فئة الشبكة
    if (networkInfo.networkClass === 'A') {
      // شبكات Class A (10.x.x.x)
      broadcasts.add('10.255.255.255')
      broadcasts.add('10.0.255.255')
      broadcasts.add('10.10.255.255')
    } else if (networkInfo.networkClass === 'B') {
      // شبكات Class B (172.16-31.x.x)
      broadcasts.add('172.31.255.255')
      broadcasts.add('172.16.255.255')
      broadcasts.add('172.20.255.255')
    } else {
      // شبكات Class C (192.168.x.x)
      broadcasts.add('192.168.1.255')
      broadcasts.add('192.168.0.255')
      broadcasts.add('192.168.255.255')
    }

    return Array.from(broadcasts)
  } catch (error) {
    console.error('[MAIN] Error generating smart broadcasts:', error)
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

// دالة للحصول على IP address (متوافقة مع الكود القديم)
function getLocalIPAddress(): string {
  try {
    const networkInfo = detectNetworkInfo()
    return networkInfo.ip
  } catch (error) {
    console.error('[MAIN] Error getting IP address:', error)
    throw new Error('Cannot determine network IP address')
  }
}

// دالة للحصول على معرف الجهاز الفريد
function getMachineIdentifier(): string {
  try {
    // استخدام معلومات الجهاز لإنشاء معرف ثابت
    const hostname = os.hostname()
    const platform = os.platform()
    const arch = os.arch()
    const networkInterfaces = os.networkInterfaces()

    // الحصول على عنوان MAC للشبكة الأولى
    let macAddress = ''
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName]
      if (interfaces) {
        for (const interfaceInfo of interfaces) {
          if (!interfaceInfo.internal && interfaceInfo.mac && interfaceInfo.mac !== '00:00:00:00:00:00') {
            macAddress = interfaceInfo.mac
            break
          }
        }
        if (macAddress) break
      }
    }

    // إنشاء hash ثابت من معلومات الجهاز
    const machineData = `${hostname}-${platform}-${arch}-${macAddress}`
    const hash = crypto.createHash('md5').update(machineData).digest('hex')

    // إرجاع أول 8 أحرف من الـ hash
    return hash.substring(0, 8).toUpperCase()

  } catch (error) {
    console.error('[NETWORK] Error generating machine ID:', error)
    // fallback إلى timestamp إذا فشل
    return Date.now().toString(36).toUpperCase()
  }
}

export function setupNetworkHandlers() {
  // UDP Server Discovery - البحث عن الخادم
  ipcMain.handle('discover-server-udp', async () => {
    return new Promise((resolve) => {
      const udpSocket = dgram.createSocket('udp4')
      let resolved = false

      const timeoutHandler = setTimeout(() => {
        if (!resolved) {
          resolved = true
          udpSocket.close()
          console.log('[UDP CLIENT] ⏰ Discovery timeout - no server found')
          resolve(null)
        }
      }, 5000)

      udpSocket.on('message', (msg, rinfo) => {
        if (resolved) return

        try {
          const message = JSON.parse(msg.toString())
          console.log(`[UDP CLIENT] 📨 Received message from ${rinfo.address}:${rinfo.port}:`, message)

          // التحقق من نوع الرسالة - يمكن أن تكون discovery أو server_broadcast
          if ((message.type === 'discovery' && message.data?.server) ||
              (message.type === 'server_broadcast' && message.data?.server)) {
            resolved = true
            clearTimeout(timeoutHandler)
            udpSocket.close()

            const serverInfo = {
              ip: message.data.server.ip,
              port: message.data.server.port
            }

            console.log('[UDP CLIENT] ✅ Server discovered:', serverInfo)
            updateNetworkServerInfo(serverInfo.ip, serverInfo.port)
            resolve(serverInfo)
          }
        } catch (error) {
          console.warn('[UDP CLIENT] ⚠️ Invalid message received:', error)
        }
      })

      udpSocket.on('error', (error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutHandler)
          udpSocket.close()
          console.error('[UDP CLIENT] ❌ Socket error:', error)
          resolve(null)
        }
      })

      udpSocket.bind(() => {
        udpSocket.setBroadcast(true)

        const discoveryMessage = {
          type: 'discovery',
          timestamp: Date.now()
        }

        const messageBuffer = Buffer.from(JSON.stringify(discoveryMessage))
        const broadcasts = generateSmartBroadcasts()

        console.log(`[UDP CLIENT] 📡 Smart broadcasting to ${broadcasts.length} addresses:`, broadcasts)

        broadcasts.forEach(broadcast => {
          try {
            udpSocket.send(messageBuffer, 4000, broadcast)
            console.log(`[UDP CLIENT] 📤 Sent discovery to ${broadcast}:4000`)
          } catch (error) {
            console.warn(`[UDP CLIENT] ⚠️ Failed to send to ${broadcast}:`, error)
          }
        })

        console.log('[UDP CLIENT] 🔍 Waiting for server responses...')
      })
    })
  })

  // Get server info
  ipcMain.handle('get-server-info', async () => {
    return discoveredServerIp ? { ip: discoveredServerIp, port: discoveredServerPort } : null
  })

  // Get local IP address
  ipcMain.handle('get-device-network-info', async () => {
    try {
      const ipAddress = getLocalIPAddress()
      return {
        ipAddress,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new Error('Cannot determine device network information')
    }
  })

  // Update server info
  ipcMain.handle('update-server-info', async (_event, serverInfo: { ip: string; port: number }) => {
    if (serverInfo?.ip && serverInfo?.port) {
      updateNetworkServerInfo(serverInfo.ip, serverInfo.port)
      return { success: true }
    }
    return { success: false, message: 'Invalid server info' }
  })

  // Get machine ID
  ipcMain.handle('get-machine-id', async () => {
    try {
      const machineId = getMachineIdentifier()
      return { machineId }
    } catch (error) {
      throw new Error('Cannot determine machine ID')
    }
  })

  // Get network info (IP address)
  ipcMain.handle('get-network-info', async () => {
    try {
      const networkInfo = detectNetworkInfo()
      return {
        ip: networkInfo.ip,
        subnet: networkInfo.subnet,
        broadcastAddress: networkInfo.broadcastAddress,
        networkClass: networkInfo.networkClass
      }
    } catch (error) {
      console.error('[NETWORK] Error getting network info:', error)
      // Fallback to basic IP detection
      const ip = getLocalIPAddress()
      return { ip }
    }
  })

  console.log('[HANDLERS] 🌐 Network handlers registered')
}
