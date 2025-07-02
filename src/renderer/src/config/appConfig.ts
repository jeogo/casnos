// Application Configuration
export const APP_CONFIG = {
  // Device Configuration
  DEVICE: {
    ID: 'customer-screen', // Unique identifier for this screen
    TYPE: 'customer', // Type of device (updated to match new device types)
    NAME: 'شاشة العملاء', // Arabic name for the screen
    NAME_EN: 'Customer Screen', // English name
    CAPABILITIES: ['display', 'ticket-generation', 'service-selection'],
    VERSION: '1.0.0'
  },

  // Display Device ID in database
  DISPLAY_DEVICE_ID: 1,

  // Connection Settings
  CONNECTION: {
    RECONNECT_INTERVAL: 5000, // ms
    DISCOVERY_RETRY_INTERVAL: 2000, // ms
    DISCOVERY_ERROR_RETRY_INTERVAL: 5000, // ms
    SOCKET_TIMEOUT: 4000, // ms
    SOCKET_RECONNECTION_ATTEMPTS: 5,
    SOCKET_RECONNECTION_DELAY: 2000 // ms
  },

  // UI Configuration
  UI: {
    STATUS_COLORS: {
      connected: '#4caf50',
      connecting: '#ff9800',
      disconnected: '#f44336',
      error: '#e91e63',
    },
    THEMES: {
      primary: '#1976d2',
      secondary: '#666',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336'
    }
  },

  // API Endpoints
  API: {
    SERVICES: '/api/services',
    TICKETS: '/api/tickets',
    DEVICES: '/api/devices',
    PRINTERS: (deviceId: number) => `/api/devices/${deviceId}/printers`,
    HEALTH: '/health'
  }
};

export default APP_CONFIG;
