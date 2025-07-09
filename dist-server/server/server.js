"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const ip_1 = __importDefault(require("ip"));
const os_1 = require("os");
const db_1 = require("./db");
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const windowRoutes_1 = __importDefault(require("./routes/windowRoutes"));
const dailyResetRoutes_1 = __importDefault(require("./routes/dailyResetRoutes"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const udpServer_1 = require("./services/udpServer");
dotenv_1.default.config();
function getNetworkInfo() {
    const interfaces = (0, os_1.networkInterfaces)();
    const addresses = [];
    const serverIP = ip_1.default.address();
    const ipParts = serverIP.split('.');
    const networkAddress = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
    const subnetMaskLength = 24;
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname]?.forEach((iface) => {
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
        gateway: networkAddress.replace(/\.0$/, '.1'),
    };
}
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const socket_1 = require("./socket");
const io = (0, socket_1.initializeSocket)(httpServer);
exports.io = io;
(0, socket_1.setupSocketHandlers)(io);
const networkInfo = getNetworkInfo();
try {
    (0, db_1.initializeDatabase)();
    if (process.env.NODE_ENV === 'development') {
        console.log('🗃️ Database initialized successfully');
        console.log('🌐 Network Information:');
        console.log(` - Server IP: ${networkInfo.ip}`);
        console.log(' - Network Interfaces:');
        networkInfo.addresses.forEach(addr => {
            console.log(`   • ${addr.interface}: ${addr.address} (${addr.family})`);
        });
        console.log(` - Subnet: ${networkInfo.subnet.networkAddress}/${networkInfo.subnet.subnetMaskLength}`);
    }
}
catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
}
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
    });
});
app.get('/health', (req, res) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const isLocalNetwork = ip_1.default.isPrivate(clientIP);
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        network: {
            serverIP: networkInfo.ip,
            clientIP: clientIP,
            isLocalNetwork: isLocalNetwork
        }
    });
});
app.get('/api/health', (req, res) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    res.status(200).json({
        success: true,
        status: 'OK',
        message: 'CASNOS API Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        network: {
            serverIP: networkInfo.ip,
            clientIP: clientIP,
            isLocalNetwork: ip_1.default.isPrivate(clientIP)
        },
        services: {
            database: 'connected',
            socket: 'active',
            udp: 'broadcasting'
        }
    });
});
app.get('/api/network', (req, res) => {
    const info = getNetworkInfo();
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
            isLocal: ip_1.default.isPrivate(req.ip || req.socket.remoteAddress || '')
        }
    });
});
app.use('/api/tickets', ticketRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/windows', windowRoutes_1.default);
app.use('/api/reset', dailyResetRoutes_1.default);
app.get('/api/stats', (req, res) => {
    res.redirect('/api/tickets/statistics');
});
app.get('/api/queue/status', (req, res) => {
    try {
        const { ticketOperations } = require('./db');
        const pendingTickets = ticketOperations.getPendingTickets();
        const allTickets = ticketOperations.getAll();
        const stats = {
            pending: pendingTickets.length,
            total: allTickets.length,
            served: allTickets.filter((t) => t.status === 'served').length,
            called: allTickets.filter((t) => t.status === 'called').length
        };
        res.json({
            success: true,
            data: {
                stats,
                pendingTickets,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error in /api/queue/status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Queue status error: ' + (error instanceof Error ? error.message : 'Unknown error'),
                statusCode: 500,
                timestamp: new Date().toISOString()
            }
        });
    }
});
app.get('/api/tickets/recent', (req, res) => {
    try {
        const { ticketOperations } = require('./db');
        const limit = parseInt(req.query.limit) || 10;
        const allTickets = ticketOperations.getAll();
        const recentTickets = allTickets
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        res.json({
            success: true,
            count: recentTickets.length,
            data: recentTickets
        });
    }
    catch (error) {
        console.error('Error in /api/tickets/recent:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Recent tickets error: ' + (error instanceof Error ? error.message : 'Unknown error'),
                statusCode: 500,
                timestamp: new Date().toISOString()
            }
        });
    }
});
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
    });
});
app.use(errorMiddleware_1.notFoundHandler);
app.use(errorMiddleware_1.errorHandler);
async function startServer() {
    try {
        const PORT = parseInt(process.env.PORT || '3001', 10);
        const HOST = process.env.HOST || '0.0.0.0';
        httpServer.listen(PORT, HOST, async () => {
            console.log(`🚀 Server is running at http://${networkInfo.ip}:${PORT}`);
            console.log(`📡 API available at http://${networkInfo.ip}:${PORT}/api`);
            console.log('🌍 Network interfaces:');
            networkInfo.addresses.forEach(addr => {
                console.log(`   • ${addr.interface}: http://${addr.address}:${PORT}`);
            });
            try {
                await udpServer_1.udpServer.start();
                console.log('📡 UDP Discovery server started successfully');
            }
            catch (error) {
                console.error('❌ Failed to start UDP server:', error);
            }
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    udpServer_1.udpServer.stop();
    httpServer.close(() => {
        console.log('🛑 Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    udpServer_1.udpServer.stop();
    httpServer.close(() => {
        console.log('🛑 Server closed');
        process.exit(0);
    });
});
