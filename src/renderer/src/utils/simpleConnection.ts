// Simple and Stable Connection Manager
import { io, Socket } from 'socket.io-client';

class SimpleConnectionManager {
  private socket: Socket | null = null;
  private baseURL: string = '';
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Simple reconnection settings
  private reconnectDelay: number = 3000; // 3 seconds - stable delay
  private maxReconnectDelay: number = 10000; // Max 10 seconds
  private reconnectAttempts: number = 0;
  private maxLoggedAttempts: number = 5; // Only log first 5 attempts

  // Connection state
  private isSystemReady: boolean = false;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  // Initialize with server info
  async initialize(): Promise<boolean> {
    try {
      console.log('[Connection] 🚀 Initializing connection...');

      // Try to discover server
      const serverInfo = await this.discoverServer();
      if (!serverInfo) {
        console.error('[Connection] ❌ No server found');
        return false;
      }

      this.baseURL = `http://${serverInfo.ip}:${serverInfo.port}`;
      console.log(`[Connection] ✅ Server found: ${this.baseURL}`);

      return await this.connect();
    } catch (error) {
      console.error('[Connection] ❌ Initialization failed:', error);
      return false;
    }
  }

  // Simple server discovery
  private async discoverServer(): Promise<{ip: string, port: number} | null> {
    try {
      // Try UDP discovery first
      const serverInfo = await (window as any).api?.discoverServerUdp?.();
      if (serverInfo && serverInfo.ip) {
        return { ip: serverInfo.ip, port: serverInfo.port || 3001 };
      }

      // Fallback to common IPs
      const commonIPs = ['192.168.1.26', '192.168.1.1', '192.168.1.5'];
      for (const ip of commonIPs) {
        try {
          const response = await fetch(`http://${ip}:3001/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
          });

          if (response.ok) {
            return { ip, port: 3001 };
          }
        } catch (e) {
          // Continue to next IP
        }
      }

      return null;
    } catch (error) {
      console.error('[Connection] Discovery error:', error);
      return null;
    }
  }

  // Simple connection method
  private async connect(): Promise<boolean> {
    if (this.isConnecting || this.isConnected()) {
      return this.isConnected();
    }

    this.isConnecting = true;

    try {
      console.log('[Connection] 🔌 Connecting to server...');

      // Disconnect existing socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket with simple settings
      this.socket = io(this.baseURL, {
        forceNew: true,
        timeout: 10000,
        reconnection: false, // We handle reconnection manually
        transports: ['websocket', 'polling']
      });

      // Set up simple event handlers
      this.setupEventHandlers();

      return true;
    } catch (error) {
      console.error('[Connection] ❌ Connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
      return false;
    }
  }

  // Simple event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Connection] ✅ Connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.isSystemReady = true;

      // Stop any reconnection timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Restore event listeners
      this.restoreListeners();
    });

    this.socket.on('disconnect', (reason) => {
      // Only log important disconnections
      if (reason !== 'io client disconnect') {
        console.log(`[Connection] ❌ Disconnected: ${reason}`);
      }

      this.isSystemReady = false;
      this.isConnecting = false;

      // Auto-reconnect for unexpected disconnections
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      // Only log first few errors to avoid spam
      if (this.reconnectAttempts <= this.maxLoggedAttempts) {
        console.error('[Connection] ❌ Connection error:', error.message);
      }

      this.isConnecting = false;
      this.isSystemReady = false;
      this.scheduleReconnect();
    });
  }

  // Simple reconnection scheduling
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;

    // Calculate delay with simple exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 5)),
      this.maxReconnectDelay
    );

    // Only log every 5th attempt to reduce spam
    if (this.reconnectAttempts % 5 === 0 || this.reconnectAttempts <= this.maxLoggedAttempts) {
      console.log(`[Connection] 🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // Simple listener restoration
  private restoreListeners(): void {
    if (!this.socket) return;

    for (const [event, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
  }

  // Public methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isReady(): boolean {
    return this.isSystemReady;
  }

  // Add event listener
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket && this.socket.connected) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit event
  emit(event: string, data?: any): boolean {
    if (!this.isReady()) {
      console.warn(`[Connection] ⚠️ Cannot emit ${event} - not ready`);
      return false;
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }

    return false;
  }

  // Force reconnection
  forceReconnect(): void {
    console.log('[Connection] 🔄 Force reconnecting...');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts = 0;
    this.connect();
  }

  // Disconnect
  disconnect(): void {
    console.log('[Connection] 🔌 Disconnecting...');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isSystemReady = false;
    this.isConnecting = false;
  }
}

// Export singleton instance
export const connectionManager = new SimpleConnectionManager();
export default connectionManager;
