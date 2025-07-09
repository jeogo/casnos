"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.udpServer = void 0;
const dgram_1 = __importDefault(require("dgram"));
const os_1 = __importDefault(require("os"));
class UDPServer {
    constructor(port = 4000, serverPort = 3001) {
        this.socket = null;
        this.broadcastInterval = null;
        this.port = port;
        this.serverPort = serverPort;
    }
    detectNetworkInfo() {
        const interfaces = os_1.default.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const nets = interfaces[name];
            if (!nets)
                continue;
            for (const net of nets) {
                if (net.family === 'IPv4' && !net.internal) {
                    const ip = net.address;
                    if (this.isPrivateNetwork(ip)) {
                        const subnet = net.netmask;
                        const networkClass = this.getNetworkClass(ip);
                        const broadcastAddress = this.calculateBroadcastAddress(ip, subnet);
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
    isPrivateNetwork(ip) {
        return (ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip));
    }
    getNetworkClass(ip) {
        if (ip.startsWith('10.'))
            return 'A';
        if (ip.startsWith('172.'))
            return 'B';
        if (ip.startsWith('192.168.'))
            return 'C';
        return 'C';
    }
    calculateBroadcastAddress(ip, netmask) {
        const ipParts = ip.split('.').map(Number);
        const maskParts = netmask.split('.').map(Number);
        const broadcastParts = ipParts.map((ipPart, index) => {
            const maskPart = maskParts[index] || 0;
            return ipPart | (255 - maskPart);
        });
        return broadcastParts.join('.');
    }
    generateNetworkAwareBroadcasts() {
        try {
            const networkInfo = this.detectNetworkInfo();
            const broadcasts = new Set();
            broadcasts.add('255.255.255.255');
            broadcasts.add(networkInfo.broadcastAddress);
            if (networkInfo.networkClass === 'A') {
                broadcasts.add('10.255.255.255');
                broadcasts.add('10.0.255.255');
                broadcasts.add('10.10.255.255');
            }
            else if (networkInfo.networkClass === 'B') {
                broadcasts.add('172.31.255.255');
                broadcasts.add('172.16.255.255');
                broadcasts.add('172.20.255.255');
            }
            else {
                broadcasts.add('192.168.1.255');
                broadcasts.add('192.168.0.255');
                broadcasts.add('192.168.255.255');
            }
            return Array.from(broadcasts);
        }
        catch (error) {
            return [
                '255.255.255.255',
                '192.168.1.255',
                '192.168.0.255',
                '10.255.255.255',
                '172.31.255.255'
            ];
        }
    }
    getLocalIPAddress() {
        try {
            const networkInfo = this.detectNetworkInfo();
            return networkInfo.ip;
        }
        catch (error) {
            throw new Error('No valid local network IP address found');
        }
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = dgram_1.default.createSocket('udp4');
                this.socket.on('error', (error) => {
                    console.error('❌ UDP Server error:', error);
                    reject(error);
                });
                this.socket.on('message', (msg, rinfo) => {
                    this.handleClientMessage(msg, rinfo);
                });
                this.socket.on('listening', () => {
                    const address = this.socket?.address();
                    console.log(`📡 UDP Server listening on ${address?.address}:${address?.port}`);
                    this.socket?.setBroadcast(true);
                    this.startBroadcasting();
                    resolve();
                });
                this.socket.bind(this.port, '0.0.0.0');
            }
            catch (error) {
                console.error('❌ Failed to start UDP server:', error);
                reject(error);
            }
        });
    }
    handleClientMessage(msg, rinfo) {
        try {
            const message = JSON.parse(msg.toString());
            console.log(`📨 UDP: Received message from ${rinfo.address}:${rinfo.port}`, message);
            if (message.type === 'discovery') {
                console.log(`🔍 UDP: Processing discovery request from ${rinfo.address}:${rinfo.port}`);
                this.sendDiscoveryResponse(rinfo);
            }
        }
        catch (error) {
            console.log('📨 UDP: Invalid message received, ignoring');
        }
    }
    sendDiscoveryResponse(rinfo) {
        const serverIP = this.getLocalIPAddress();
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
        };
        const responseBuffer = Buffer.from(JSON.stringify(response));
        if (this.socket) {
            this.socket.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address, (error) => {
                if (error) {
                    console.error('Failed to send UDP response:', error);
                }
                else {
                    console.log(`📤 UDP: Sent discovery response to ${rinfo.address}:${rinfo.port}`);
                }
            });
        }
    }
    startBroadcasting() {
        this.sendBroadcast();
        this.broadcastInterval = setInterval(() => {
            this.sendBroadcast();
        }, 30000);
    }
    sendBroadcast() {
        const serverIP = this.getLocalIPAddress();
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
        };
        const messageBuffer = Buffer.from(JSON.stringify(broadcastMessage));
        if (this.socket) {
            this.socket.setBroadcast(true);
            const broadcastAddresses = this.generateNetworkAwareBroadcasts();
            console.log(`📡 UDP: Smart broadcasting to ${broadcastAddresses.length} addresses:`, broadcastAddresses);
            broadcastAddresses.forEach(address => {
                this.socket?.send(messageBuffer, 0, messageBuffer.length, this.port, address, (error) => {
                    if (error) {
                        console.error(`❌ Failed to send UDP broadcast to ${address}:`, error.message);
                    }
                    else {
                        console.log(`📡 UDP: Broadcast sent to ${address}`);
                    }
                });
            });
        }
    }
    stop() {
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
        if (this.socket) {
            this.socket.close(() => {
                console.log('📡 UDP Server stopped');
            });
            this.socket = null;
        }
    }
}
exports.udpServer = new UDPServer(4000, 3001);
exports.default = exports.udpServer;
