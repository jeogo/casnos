import { ServerOptions } from 'socket.io';
import ip from 'ip';

// Get local network IP for CORS
const localIP = ip.address();

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: '*', // Allow all origins in LAN
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

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Device events
  DEVICE_REGISTER: 'device:register',
  DEVICE_REGISTERED: 'device:registered',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  DEVICE_STATUS: 'device:status-update',
  DEVICE_CONNECTED: 'device:connected',
  DEVICE_DISCONNECTED: 'device:disconnected',

  // Ticket events
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
  TICKET_CALLED: 'ticket:called',
  TICKET_SERVED: 'ticket:served',
  TICKET_STATUS: 'ticket:status-update',

  // Queue events
  QUEUE_UPDATE: 'queue:update',
  QUEUE_STATS: 'queue:stats-update',

  // Print events
  PRINT_JOB: 'print:job',
  PRINT_STATUS: 'print:status-update',
  PRINT_COMPLETED: 'print:completed',

  // 🆕 Simplified Display Print Event (النظام الجديد المبسط)
  DISPLAY_PRINT_TICKET: 'display:print-ticket',

  // ⚡ Real-time Print Events (النظام الفوري)
  PRINT_PENDING_INSTANT: 'print:pending-instant',

  // System events
  SYSTEM_RESET: 'system:reset',
  INITIAL_DATA: 'initial-data',

  // Real-time events
  REALTIME_UPDATE: 'realtime:update'
} as const;

// Socket rooms configuration
export const SOCKET_ROOMS = {
  DISPLAYS: 'displays',
  WINDOWS: 'windows',
  CUSTOMERS: 'customers',
  PRINTERS: 'printers'
} as const;

// Device types
export const DEVICE_TYPES = {
  DISPLAY: 'display',
  WINDOW: 'window',
  CUSTOMER: 'customer',
  PRINTER: 'printer',
  ADMIN: 'admin'
} as const;
