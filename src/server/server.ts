import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'
import ip from 'ip'
import { networkInterfaces } from 'os'
import { initializeDatabase, ticketOperations } from './db'
import ticketRoutes from './routes/ticketRoutes'
import serviceRoutes from './routes/serviceRoutes'
import deviceRoutes from './routes/deviceRoutes'
import windowRoutes from './routes/windowRoutes'
import dailyResetRoutes from './routes/dailyResetRoutes'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware'
import { udpServer } from './services/udpServer'

dotenv.config()

// IP address utilities
function getNetworkInfo() {
  const interfaces = networkInterfaces();
  const addresses: { interface: string; address: string; family: string }[] = [];
  const serverIP = ip.address();
  const ipParts = serverIP.split('.');
  const networkAddress = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
  const subnetMaskLength = 24; // Assuming a typical /24 network

  // Collect all network interfaces
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname]?.forEach((iface) => {
      // Skip internal and IPv6 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        addresses.push({
          interface: ifname,
          address: iface.address,
          family: iface.family
        });
      }
    });
  });

  return {
    ip: serverIP,
    addresses,
    subnet: {
      networkAddress,
      subnetMaskLength,
    },
    gateway: networkAddress.replace(/\.0$/, '.1'), // Assume first IP is gateway
  };
}

const app = express()
const httpServer = createServer(app)
// Initialize Socket.IO with professional modular handlers
import { initializeSocket, setupSocketHandlers } from './socket';

const io = initializeSocket(httpServer);
setupSocketHandlers(io);
const networkInfo = getNetworkInfo()

try {
  // Initialize database
  initializeDatabase()

  // Silent server startup - only show network info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🗃️ Database initialized successfully')
    console.log('🌐 Network Information:')
    console.log(` - Server IP: ${networkInfo.ip}`)
    console.log(' - Network Interfaces:')
    networkInfo.addresses.forEach(addr => {
      console.log(`   • ${addr.interface}: ${addr.address} (${addr.family})`);
    });
    console.log(` - Subnet: ${networkInfo.subnet.networkAddress}/${networkInfo.subnet.subnetMaskLength}`);
  }
} catch (error) {
  console.error('Failed to initialize database:', error)
  process.exit(1)
}

app.use(helmet())
app.use(compression())

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Root endpoint with network info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CASNOS Queue Management System',
    version: '1.0.0',
    status: 'running',
    network: {
      serverIP: networkInfo.ip,
      interfaces: networkInfo.addresses,
      subnet: networkInfo.subnet
    },
    timestamp: new Date().toISOString()
  })
})

// Enhanced health check with network status
app.get('/health', (req, res) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown'
  const isLocalNetwork = ip.isPrivate(clientIP)

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    network: {
      serverIP: networkInfo.ip,
      clientIP: clientIP,
      isLocalNetwork: isLocalNetwork
    }
  })
})

// API Health check endpoint
app.get('/api/health', (req, res) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown'

  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'CASNOS API Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    network: {
      serverIP: networkInfo.ip,
      clientIP: clientIP,
      isLocalNetwork: ip.isPrivate(clientIP)
    },
    services: {
      database: 'connected',
      socket: 'active',
      udp: 'broadcasting'
    }
  })
})

// Network info endpoint
app.get('/api/network', (req, res) => {
  const info = getNetworkInfo() // Get fresh network info
  res.status(200).json({
    server: {
      ip: info.ip,
      hostname: require('os').hostname()
    },
    interfaces: info.addresses,
    subnet: info.subnet,
    gateway: info.gateway,
    client: {
      ip: req.ip || req.socket.remoteAddress,
      isLocal: ip.isPrivate(req.ip || req.socket.remoteAddress || '')
    }
  })
})

// Routes
app.use('/api/tickets', ticketRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/windows', windowRoutes)
app.use('/api/reset', dailyResetRoutes)

// Additional API endpoints that tests are looking for
app.get('/api/stats', (req, res) => {
  // Redirect to tickets statistics
  res.redirect('/api/tickets/statistics')
})

app.get('/api/queue/status', (req, res) => {
  try {
    const { ticketOperations } = require('./db')
    const pendingTickets = ticketOperations.getPendingTickets()
    const allTickets = ticketOperations.getAll()

    const stats = {
      pending: pendingTickets.length,
      total: allTickets.length,
      served: allTickets.filter((t: any) => t.status === 'served').length,
      called: allTickets.filter((t: any) => t.status === 'called').length
    }

    res.json({
      success: true,
      data: {
        stats,
        pendingTickets,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error in /api/queue/status:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Queue status error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    })
  }
})

app.get('/api/tickets/recent', (req, res) => {
  try {
    const { ticketOperations } = require('./db')
    const limit = parseInt(req.query.limit as string) || 10
    const allTickets = ticketOperations.getAll()

    // Get most recent tickets (sorted by creation time, most recent first)
    const recentTickets = allTickets
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    res.json({
      success: true,
      count: recentTickets.length,
      data: recentTickets
    })
  } catch (error) {
    console.error('Error in /api/tickets/recent:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Recent tickets error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    })
  }
})

// API documentation
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'CASNOS Queue Management System API',
    version: '1.0.0',
    status: 'running',
    network: {
      serverIP: networkInfo.ip,
      subnet: networkInfo.subnet
    },
    routes: [
      'GET /api/health - Health check',
      'GET /api/services - List services',
      'POST /api/services - Create service',
      'GET /api/windows - List windows',
      'POST /api/windows - Create window',
      'GET /api/tickets - List tickets',
      'POST /api/tickets - Create ticket',
      'GET /api/devices - List devices',
      'POST /api/devices - Register device'
    ],
    timestamp: new Date().toISOString()
  })
})

app.use(notFoundHandler)
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    const PORT = parseInt(process.env.PORT || '3001', 10)
    const HOST = process.env.HOST || '0.0.0.0'

    httpServer.listen(PORT, HOST, async () => {
      console.log(`🚀 Server is running at http://${networkInfo.ip}:${PORT}`)
      console.log(`📡 API available at http://${networkInfo.ip}:${PORT}/api`)
      console.log('🌍 Network interfaces:')
      networkInfo.addresses.forEach(addr => {
        console.log(`   • ${addr.interface}: http://${addr.address}:${PORT}`)
      })

      // Start UDP discovery server
      try {
        await udpServer.start()
        console.log('📡 UDP Discovery server started successfully')
      } catch (error) {
        console.error('❌ Failed to start UDP server:', error)
      }
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  udpServer.stop();
  httpServer.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  udpServer.stop();
  httpServer.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io };
