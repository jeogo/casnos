"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVICE_TYPES = exports.SOCKET_ROOMS = exports.SOCKET_EVENTS = exports.socketConfig = void 0;
const ip_1 = __importDefault(require("ip"));
const localIP = ip_1.default.address();
exports.socketConfig = {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 10000,
    pingInterval: 5000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/',
    serveClient: false
};
exports.SOCKET_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    DEVICE_REGISTER: 'device:register',
    DEVICE_REGISTERED: 'device:registered',
    DEVICE_HEARTBEAT: 'device:heartbeat',
    DEVICE_STATUS: 'device:status-update',
    DEVICE_CONNECTED: 'device:connected',
    DEVICE_DISCONNECTED: 'device:disconnected',
    TICKET_CREATED: 'ticket:created',
    TICKET_UPDATED: 'ticket:updated',
    TICKET_CALLED: 'ticket:called',
    TICKET_SERVED: 'ticket:served',
    TICKET_STATUS: 'ticket:status-update',
    QUEUE_UPDATE: 'queue:update',
    QUEUE_STATS: 'queue:stats-update',
    PRINT_JOB: 'print:job',
    PRINT_STATUS: 'print:status-update',
    PRINT_COMPLETED: 'print:completed',
    DISPLAY_PRINT_TICKET: 'display:print-ticket',
    PRINT_PENDING_INSTANT: 'print:pending-instant',
    SYSTEM_RESET: 'system:reset',
    INITIAL_DATA: 'initial-data',
    REALTIME_UPDATE: 'realtime:update'
};
exports.SOCKET_ROOMS = {
    DISPLAYS: 'displays',
    WINDOWS: 'windows',
    CUSTOMERS: 'customers',
    PRINTERS: 'printers'
};
exports.DEVICE_TYPES = {
    DISPLAY: 'display',
    WINDOW: 'window',
    CUSTOMER: 'customer',
    PRINTER: 'printer',
    ADMIN: 'admin'
};
