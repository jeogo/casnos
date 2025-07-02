import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'
import { initializeDatabase } from './db/database'
import { setupSocketHandlers } from './sockets/socketHandlers'
import { setSocketIO } from './utils/socketInstance'
import ticketRoutes from './routes/ticketRoutes'
import serviceRoutes from './routes/serviceRoutes'
import deviceRoutes from './routes/deviceRoutes'
import employeeRoutes from './routes/employeeRoutes'
import windowRoutes from './routes/windowRoutes'
import dailyResetRoutes from './routes/dailyResetRoutes'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware'
import { dailyResetManager } from './utils/dailyReset'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  serveClient: false
})

try {
  // Initializing database
  initializeDatabase()
  // Database initialized successfully
} catch (error) {
  process.exit(1)
}

;(async () => {
  try {
    // Performing daily reset on startup
    await dailyResetManager.performResetOnStartup()
    // Daily reset completed
  } catch (error) {
  }
})()

app.use(helmet())
app.use(compression())

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CASNOS Queue Management System',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.use('/api/tickets', ticketRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/windows', windowRoutes)
app.use('/api/daily-reset', dailyResetRoutes)

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    api: true
  })
})

app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'CASNOS Queue Management API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/services - List services',
      'POST /api/services - Create service',
      'GET /api/windows - List windows',
      'POST /api/windows - Create window',
      'GET /api/tickets - List tickets',
      'POST /api/tickets - Create ticket',
      'GET /api/devices - List devices',
      'POST /api/devices - Register device',
      'GET /api/devices/printers/active - List active printers'
    ],
    timestamp: new Date().toISOString()
  })
})

setSocketIO(io)
setupSocketHandlers(io)

;(async () => {
  try {
    // Initializing UDP communication
    await initializeUDPCommunication()
    // UDP communication initialized
  } catch (error) {
  }
})()

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

httpServer.listen(PORT, HOST, () => {
})

process.on('SIGTERM', () => {
  // تم حذف السجل - لا داعي للطباعة هنا
  httpServer.close(() => {
    // تم حذف السجل - لا داعي للطباعة هنا
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  // تم حذف السجل - لا داعي للطباعة هنا
  httpServer.close(() => {
    // تم حذف السجل - لا داعي للطباعة هنا
    process.exit(0)
  })
})

export { app, httpServer }

async function initializeUDPCommunication() {
  const { udpCommunication } = await import('./utils/udpCommunication')
  await udpCommunication.start()
}
