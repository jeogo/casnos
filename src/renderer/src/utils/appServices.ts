// Fetch a single ticket by ID (used for real-time updates)

import { io, Socket } from 'socket.io-client';

interface Service {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

interface Printer {
  id?: number;
  name: string;
  location?: string;
  device_id?: number;
  type: 'server' | 'local';
}

class AppServices {
  // Fetch a single ticket by ID (used for real-time updates)
  async getTicketById(ticketId: number): Promise<any> {
    try {
      const url = `${this.baseURL}/api/tickets/${ticketId}`;
      const response = await this.fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch ticket');
      const data = await response.json();
      return data?.ticket || data?.data || data;
    } catch (error) {
      console.error('[AppServices] Error fetching ticket by ID:', error);
      return null;
    }
  }
  private socket: Socket | null = null;
  private baseURL: string = '';
  private defaultTimeout: number = 8000; // 8 seconds default timeout
  private realtimeListeners: Map<string, Array<(data: any) => void>> = new Map();
  private deviceId: string | null = null;

  // ✅ UNLIMITED RECONNECTION: Keep trying forever, UDP only, no delays
  private reconnectAttempts: number = 0;
  private reconnectDelay: number = 500; // Start with 500ms - very fast
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private lastConnectionTime: number = 0;
  private storedDeviceInfo: any = null; // Store device info for reconnection
  private isSystemFunctional: boolean = false; // Controls if functionality should work

  // Real-time event listener management
  onRealtimeEvent(event: string, callback: (data: any) => void): void {
    if (!this.realtimeListeners.has(event)) {
      this.realtimeListeners.set(event, []);
    }
    this.realtimeListeners.get(event)!.push(callback);

    // Set up socket listener if socket is available
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove real-time event listener
  offRealtimeEvent(event: string, callback?: (data: any) => void): void {
    if (callback) {
      const listeners = this.realtimeListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }

      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      // Remove all listeners for this event
      this.realtimeListeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  // Emit real-time event to server (simplified)
  emitRealtimeEvent(event: string, data: any): void {
    // Block if socket not connected
    this.throwIfSocketNotConnected('emitRealtimeEvent');

    if (this.socket && this.socket.connected) {
      const enrichedData = {
        ...data,
        deviceId: this.deviceId,
        clientTime: Date.now(),
        timestamp: new Date().toISOString()
      };
      this.socket.emit(event, enrichedData);
      // Only log in development and only important events
      if (process.env.NODE_ENV === 'development' && !event.includes('heartbeat')) {
        console.log(`[Event] ${event}`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Event] Cannot emit ${event} - not connected`);
      }
      // Try to reconnect
      this.scheduleSimpleReconnect();
    }
  }

  // Helper method to create fetch with timeout
  private fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = this.defaultTimeout): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  // Initialize the service with the discovered server IP and port (NO VALIDATION)
  initialize(serverIP: string, serverPort: number = 3001) {
    // Trust UDP completely - no validation needed
    console.log(`[Connection] � Initializing with UDP server: ${serverIP}:${serverPort} (TRUSTED)`);

    this.baseURL = `http://${serverIP}:${serverPort}`;

    // Update main process with server info for ticket creation
    this.updateMainProcessServerInfo(serverIP, serverPort);

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.baseURL, {
      forceNew: true,
      reconnection: false, // We handle reconnection ourselves
      timeout: 8000,
      transports: ['websocket', 'polling']
    });

    this.setupSimpleSocketHandlers();
  }



  // ✅ UDP-ONLY SERVER DISCOVERY: Use UDP discovery from main process
  async discoverServerUdp(): Promise<{ip: string, port: number} | null> {
    try {
      console.log('[Connection] 📡 Starting UDP server discovery...');

      // Use the UDP discovery from the main process
      const serverInfo = await (window as any).api?.discoverServerUdp?.();

      if (serverInfo && serverInfo.ip && serverInfo.port) {
        console.log('[Connection] ✅ UDP Discovery successful:', serverInfo);
        return { ip: serverInfo.ip, port: serverInfo.port };
      } else {
        console.log('[Connection] ❌ UDP Discovery failed - no server response yet');
        return null;
      }
    } catch (error) {
      console.error('[Connection] ❌ UDP Discovery error:', error);
      return null;
    }
  }

  // ✅ UDP-ONLY SERVER DISCOVERY (simple and reliable - no validation)
  async discoverServer(): Promise<{ip: string, port: number} | null> {
    console.log('[Connection] 🔍 Starting UDP-only server discovery...');

    try {
      // Use UDP discovery only - trust whatever UDP provides
      const udpResult = await this.discoverServerUdp();
      if (udpResult) {
        console.log('[Connection] ✅ Server found via UDP:', udpResult);
        return udpResult;
      }

      console.log('[Connection] ❌ UDP discovery failed - will retry immediately');
      return null;
    } catch (error) {
      console.error('[Connection] ❌ Discovery error:', error);
      return null;
    }
  }

  // ✅ UDP-ONLY INITIALIZATION: Simpler and more reliable
  async initializeWithDiscovery(): Promise<boolean> {
    try {
      console.log('[Connection] 🚀 Starting UDP-only auto-discovery...');

      const serverInfo = await this.discoverServer();
      if (serverInfo) {
        // Set global variables for all components to use
        (window as any).SOCKET_SERVER_IP = serverInfo.ip;
        (window as any).SOCKET_SERVER_PORT = serverInfo.port;

        // Update main process with discovered server info
        await this.updateMainProcessServerInfo(serverInfo.ip, serverInfo.port);

        this.initialize(serverInfo.ip, serverInfo.port);
        console.log(`[Connection] ✅ Successfully initialized with UDP-discovered server: ${serverInfo.ip}:${serverInfo.port}`);
        return true;
      } else {
        console.log('[Connection] ❌ Failed to discover server via UDP - will retry');
        return false;
      }
    } catch (error) {
      console.error('[Connection] ❌ Error during UDP auto-discovery:', error);
      return false;
    }
  }

  // ✅ SIMPLE HEALTH CHECK: Use UDP discovery if needed
  async checkServerHealth(): Promise<boolean> {
    // Always allow health checks since they're needed for reconnection
    if (!this.isSystemFullyFunctional() && !this.baseURL) {
      console.warn('[Connection] ⚠️ No server configured and system not functional');
      return false;
    }

    try {
      if (!this.baseURL) {
        console.warn('[Connection] ⚠️ baseURL not set, attempting UDP discovery...');
        const discoveryResult = await this.initializeWithDiscovery();
        if (!discoveryResult) {
          return false;
        }
      }

      const response = await this.fetchWithTimeout(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }, 5000); // 5 second timeout for health check

      if (response.ok) {
        const data = await response.json();
        console.log('[Connection] ✅ Server health check successful:', data);
        return true;
      } else {
        console.error('[Connection] ❌ Server health check failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[Connection] ❌ Server health check error:', error);

      // If it's a network error, try UDP re-discovery
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        console.log('[Connection] 🔄 Network error detected, attempting UDP re-discovery...');
        const discoveryResult = await this.initializeWithDiscovery();
        return discoveryResult;
      }

      return false;
    }
  }

  // Get all services
  async getServices(): Promise<Service[]> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getServices');

    try {
      console.log('[AppServices] Fetching services from:', `${this.baseURL}/api/services`);

      // First check if server is reachable
      const isServerHealthy = await this.checkServerHealth();
      if (!isServerHealthy) {
        throw new Error('Server is not reachable. Please check if the server is running and the connection settings are correct.');
      }

      const response = await this.fetchWithTimeout(`${this.baseURL}/api/services`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('[AppServices] Services response status:', response.status);
      console.log('[AppServices] Services response headers:', Object.fromEntries(response.headers.entries()));

      // Check content type to make sure we're getting JSON
      const contentType = response.headers.get('content-type');
      console.log('[AppServices] Response content-type:', contentType);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[AppServices] Non-OK response:', responseText);

        // Check if response is HTML (usually an error page)
        if (responseText.includes('<!doctype') || responseText.includes('<html')) {
          throw new Error(`Server returned HTML error page instead of JSON. Status: ${response.status}. This usually means the API endpoint doesn't exist or the server is misconfigured.`);
        }

        throw new Error(`HTTP error! status: ${response.status}, response: ${responseText.substring(0, 200)}`);
      }

      const responseText = await response.text();
      console.log('[AppServices] Raw response:', responseText.substring(0, 200));

      // Check if response looks like HTML
      if (responseText.trim().startsWith('<!doctype') || responseText.trim().startsWith('<html')) {
        throw new Error('Server returned HTML page instead of JSON data. This usually means the API endpoint is not correctly configured.');
      }

      // Try to parse JSON
      try {
        const jsonData = JSON.parse(responseText);
        console.log('[AppServices] Parsed JSON:', jsonData);

        // Handle different response formats
        if (Array.isArray(jsonData)) {
          return jsonData;
        } else if (jsonData.success && jsonData.data) {
          return jsonData.data;
        } else if (jsonData.data) {
          return jsonData.data;
        } else {
          console.warn('[AppServices] Unexpected response format:', jsonData);
          return [];
        }
      } catch (parseError) {
        console.error('[AppServices] JSON parse error:', parseError);
        console.error('[AppServices] Response that failed to parse:', responseText.substring(0, 500));

        // Provide more helpful error message
        if (responseText.includes('<!doctype') || responseText.includes('<html')) {
          throw new Error('Server returned HTML page instead of JSON. The API endpoint may not exist or the server may be misconfigured.');
        }

        throw new Error(`Invalid JSON response from server. Response: ${responseText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('[AppServices] Error fetching services:', error);
      throw error;
    }
  }

  // Get server printers
  async getServerPrinters(): Promise<Printer[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/devices/printers/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      // Handle both direct array and {data: array} response formats
      const printers = Array.isArray(result) ? result : (result.data || []);
      return printers.map((printer: any) => ({
        ...printer,
        type: 'server' as const
      }));
    } catch (error) {
      console.error('Error fetching server printers:', error);
      throw error;
    }
  }
  // Get local printers via Electron IPC
  async getLocalPrinters(): Promise<Printer[]> {
    try {
      const printers = await window.api.getLocalPrinters();
      return printers.map((printer: any) => ({
        name: printer.name || 'Unknown Printer',
        type: 'local' as const
      }));
    } catch (error) {
      console.error('Error fetching local printers:', error);
      return [];
    }
  }

  // Register device
  async registerDevice(deviceInfo: any) {
    // NEW: Block if not connected
    this.throwIfNotConnected('registerDevice');

    try {
      // Ensure server is connected before attempting registration
      if (!this.baseURL) {
        console.warn('[AppServices] ⚠️ No baseURL set, attempting server discovery...');
        const discoverySuccess = await this.initializeWithDiscovery();
        if (!discoverySuccess) {
          throw new Error('Cannot register device: Server not found. Please ensure the server is running and accessible.');
        }
      }

      console.log('[AppServices] 📝 Registering device at:', `${this.baseURL}/api/devices/register`);
      console.log('[AppServices] Device info:', deviceInfo);

      const response = await this.fetchWithTimeout(`${this.baseURL}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceInfo),
      });

      console.log('[AppServices] Registration response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AppServices] Registration failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      console.log('[AppServices] ✅ Device registered successfully:', result);
      return result;
    } catch (error) {
      console.error('[AppServices] ❌ Error registering device:', error);
      throw error;
    }
  }

  // Create a ticket for a service
  async createTicket(serviceId: number) {
    // NEW: Block if not connected
    this.throwIfNotConnected('createTicket');

    try {
      const response = await fetch(`${this.baseURL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service_id: serviceId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Handle server response format {success: true, data: ticket}
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  // Get all tickets
  async getTickets() {
    // NEW: Block if not connected
    this.throwIfNotConnected('getTickets');

    try {
      const response = await fetch(`${this.baseURL}/api/tickets`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  // Call a ticket
  async callTicket(ticketId: number, windowLabel: string = 'Window 1') {
    // NEW: Block if not connected
    this.throwIfNotConnected('callTicket');

    try {
      const response = await fetch(`${this.baseURL}/api/tickets/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticket_id: ticketId, window_label: windowLabel }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling ticket:', error);
      throw error;
    }
  }

  // Serve ticket (mark as served)
  async serveTicket(ticketId: number, windowLabel?: string) {
    // NEW: Block if not connected
    this.throwIfNotConnected('serveTicket');

    try {
      const response = await fetch(`${this.baseURL}/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'served', window_label: windowLabel }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error serving ticket:', error);
      throw error;
    }
  }

  // Create service
  async createService(name: string) {
    // NEW: Block if not connected
    this.throwIfNotConnected('createService');

    try {
      const response = await fetch(`${this.baseURL}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  // Update service
  async updateService(serviceId: number, name: string) {
    // NEW: Block if not connected
    this.throwIfNotConnected('updateService');

    try {
      const response = await fetch(`${this.baseURL}/api/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  // Delete service
  async deleteService(serviceId: number) {
    // NEW: Block if not connected
    this.throwIfNotConnected('deleteService');

    try {
      const response = await fetch(`${this.baseURL}/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  // Get statistics
  async getStatistics() {
    // NEW: Block if not connected
    this.throwIfNotConnected('getStatistics');

    try {
      const response = await fetch(`${this.baseURL}/api/tickets/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Employee Management API Methods

  // Get all employees
  async getEmployees(): Promise<any[]> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getEmployees');

    try {
      const response = await fetch(`${this.baseURL}/api/employees`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Get active employees only
  async getActiveEmployees(): Promise<any[]> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getActiveEmployees');

    try {
      const response = await fetch(`${this.baseURL}/api/employees/active`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching active employees:', error);
      throw error;
    }
  }

  // Get next available window number for employee
  async getNextEmployeeWindowNumber(): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/next-window-number`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data.windowNumber : '1';
    } catch (error) {
      console.error('Error fetching next window number:', error);
      return '1'; // Fallback to '1'
    }
  }

  // Initialize employee session (for new employee devices)
  async initializeEmployeeSession(deviceId: string, deviceName?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, deviceName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error initializing employee session:', error);
      throw error;
    }
  }

  // Create employee window
  async createEmployeeWindow(windowNumber?: string, serviceId?: number, serviceName?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/window`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ windowNumber, serviceId, serviceName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating employee window:', error);
      throw error;
    }
  }

  // Get employee by window number
  async getEmployeeByWindowNumber(windowNumber: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/window/${windowNumber}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee by window number:', error);
      throw error;
    }
  }

  // Assign service to employee
  async assignServiceToEmployee(windowNumber: string, serviceId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/window/${windowNumber}/assign-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning service to employee:', error);
      throw error;
    }
  }

  // Remove service from employee
  async removeServiceFromEmployee(windowNumber: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/employees/window/${windowNumber}/service`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing service from employee:', error);
      throw error;
    }
  }

  // Window Management API Methods

  // Get all windows
  async getWindows(): Promise<any[]> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getWindows');

    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching windows:', error);
      return [];
    }
  }

  // Get window by ID
  async getWindowById(windowId: number): Promise<any> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getWindowById');

    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows/${windowId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching window by ID:', error);
      return null;
    }
  }

  // Create new window
  async createWindow(label: string, active: boolean = true): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label, active }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating window:', error);
      throw error;
    }
  }

  // Update window
  async updateWindow(windowId: number, label?: string, active?: boolean): Promise<any> {
    try {
      const updateData: any = {};
      if (label !== undefined) updateData.label = label;
      if (active !== undefined) updateData.active = active;

      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows/${windowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating window:', error);
      throw error;
    }
  }

  // Delete window
  async deleteWindow(windowId: number): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows/${windowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting window:', error);
      throw error;
    }
  }

  // Get services assigned to window
  async getWindowServices(windowId: number): Promise<any[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows/${windowId}/services`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching window services:', error);
      return [];
    }
  }

  // Assign services to window
  async assignServicesToWindow(windowId: number, serviceIds: number[]): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/windows/${windowId}/services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service_ids: serviceIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning services to window:', error);
      throw error;
    }
  }

  // Emit socket event
  emit(event: string, data?: any) {
    // NEW: Block if socket not connected
    this.throwIfSocketNotConnected('emit');

    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not initialized');
    }
  }

  // Listen to socket event
  on(event: string, callback: (data: any) => void) {
    // NEW: Block if socket not connected
    this.throwIfSocketNotConnected('on');

    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn('Socket not initialized');
    }
  }

  // Remove socket listener
  off(event: string, callback?: (data: any) => void) {
    // NEW: Block if socket not connected
    this.throwIfSocketNotConnected('off');

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Enhanced connection status checker
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Robust connection check with server ping
  async isConnectedRobust(): Promise<boolean> {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    // Additional health check
    try {
      return await this.checkServerHealth();
    } catch {
      return false;
    }
  }

  // Force immediate reconnection (simplified)
  forceReconnect(): void {
    console.log('[Connection] 🔄 Forcing reconnection...');

    // Reset reconnection state
    this.stopReconnection();
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Disconnect and reconnect immediately
    if (this.socket) {
      this.socket.disconnect();
    }

    // Trigger reconnection after brief delay
    setTimeout(() => {
      this.performSimpleReconnect();
    }, 100);
  }

  // Get detailed connection status for UI display
  getConnectionStatus(): {
    connected: boolean;
    reconnecting: boolean;
    attempts: number;
    lastConnectionTime: number;
    serverDiscovered: boolean;
  } {
    return {
      connected: this.isConnected(),
      reconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      lastConnectionTime: this.lastConnectionTime,
      serverDiscovered: this.isServerDiscovered()
    };
  }

  // Disconnect socket (simplified)
  disconnect() {
    console.log('[Connection] Disconnecting...');

    // Stop all reconnection attempts
    this.stopReconnection();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isSystemFunctional = false;
  }

  // Check if server is discovered
  isServerDiscovered(): boolean {
    return !!(this.baseURL || (window as any).SOCKET_SERVER_IP);
  }

  // Get server URL
  getServerUrl(): string {
    if (this.baseURL) {
      // Extract from baseURL if available
      const url = new URL(this.baseURL);
      return `${url.hostname}:${url.port}`;
    }

    // Fallback to global variables
    const ip = (window as any).SOCKET_SERVER_IP;
    const port = (window as any).SOCKET_SERVER_PORT || 3001;
    return ip ? `${ip}:${port}` : 'Not discovered';
  }

  // Get current server connection details
  getCurrentServerInfo(): {ip: string, port: number} | null {
    if (this.baseURL) {
      const url = new URL(this.baseURL);
      return {
        ip: url.hostname,
        port: parseInt(url.port) || 3001
      };
    }

    const ip = (window as any).SOCKET_SERVER_IP;
    const port = (window as any).SOCKET_SERVER_PORT || 3001;
    return ip ? { ip, port } : null;
  }
  // Get server info from Electron preload
  async getServerInfo(): Promise<any> {
    try {
      return await (window.api as any).getServerInfo();
    } catch (error) {
      console.error('Error getting server info:', error);
      throw error;
    }
  }
  // ✅ SIMPLE CONNECTION: Direct connection without complex sequencing
  connectSocket(deviceInfo?: any): Socket {
    return this.performSimpleConnection(deviceInfo);
  }

  // ✅ SIMPLE UDP-BASED CONNECTION: Use IP from UDP discovery directly (no validation)
  private performSimpleConnection(deviceInfo?: any): Socket {
    // If already connected, return existing socket
    if (this.socket && this.socket.connected) {
      console.log('[Connection] ✅ Already connected');
      return this.socket;
    }

    // Store device info for reconnections
    this.storedDeviceInfo = deviceInfo;

    // Use UDP-discovered server IP and port from global variables - TRUST UDP COMPLETELY
    const serverIP = (window as any).SOCKET_SERVER_IP;
    const serverPort = (window as any).SOCKET_SERVER_PORT || 3001;

    // Only check if UDP provided an IP - no validation, just use it
    if (!serverIP) {
      throw new Error('[Connection] 🚫 No server IP discovered via UDP. Cannot connect.');
    }

    console.log(`[Connection] 🔌 Connecting to UDP-discovered server: ${serverIP}:${serverPort} (NO VALIDATION)`);
    this.initialize(serverIP, serverPort);

    // Store device ID for real-time events
    if (deviceInfo?.device_id) {
      this.deviceId = deviceInfo.device_id;
    }

    return this.socket!;
  }  // ✅ STABLE SOCKET HANDLERS: Minimal logging, unlimited reconnection
  private setupSimpleSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Connection] ✅ Connected');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.lastConnectionTime = Date.now();
      this.stopReconnection();

      // Enable system functionality immediately
      this.isSystemFunctional = true;

      // Clear logged operations
      if (this.loggedOperations) this.loggedOperations.clear();
      if (this.loggedSocketOperations) this.loggedSocketOperations.clear();

      // Register device if info available
      if (this.storedDeviceInfo) {
        this.emitRealtimeEvent('device:register', {
          deviceId: this.storedDeviceInfo.device_id,
          deviceType: this.storedDeviceInfo.device_type,
          name: this.storedDeviceInfo.name,
          ip_address: this.storedDeviceInfo.ip_address
        });
      }

      // Restore event listeners
      this.restoreEventListeners();
    });

    this.socket.on('disconnect', (reason) => {
      // Only log server-side disconnections
      if (reason !== 'io client disconnect') {
        console.log(`[Connection] ❌ Disconnected: ${reason}`);
      }

      this.isSystemFunctional = false;
      this.isReconnecting = false;

      // Auto-reconnect for unexpected disconnections - IMMEDIATELY
      if (reason !== 'io client disconnect') {
        this.scheduleSimpleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      // Only log first error to reduce spam
      if (this.reconnectAttempts <= 1) {
        console.error('[Connection] ❌ Error:', error.message);
      }

      this.isReconnecting = false;
      this.isSystemFunctional = false;
      this.scheduleSimpleReconnect();
    });

    // Set up real-time handlers
    this.setupRealtimeHandlers();

    // Restore listeners
    for (const [event, callbacks] of this.realtimeListeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
  }

  // ✅ UNLIMITED RECONNECTION: Keep trying forever with increasing delay but no max
  private scheduleSimpleReconnect(): void {
    if (this.reconnectTimer || this.isReconnecting) {
      return; // Already scheduled or reconnecting
    }

    this.reconnectAttempts++;

    // Unlimited exponential backoff (no max delay - keep increasing)
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.3, Math.min(this.reconnectAttempts - 1, 15)),
      30000 // Max 30 seconds but keep trying
    );

    // Only log every 50th attempt to reduce spam
    if (this.reconnectAttempts % 50 === 0 || this.reconnectAttempts <= 3) {
      console.log(`[Connection] 🔄 Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts}) - UNLIMITED`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.performSimpleReconnect();
    }, delay);
  }

  // ✅ KEEP TRYING RECONNECTION: Simple reconnection logic that never gives up
  private performSimpleReconnect(): void {
    if (this.isReconnecting) return;

    this.isReconnecting = true;

    // Clean up old socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Try to reconnect after a brief delay
    setTimeout(() => {
      this.isReconnecting = false;
      try {
        // If we lost the server IP, try to discover it again
        if (!(window as any).SOCKET_SERVER_IP) {
          console.log('[Connection] 🔍 Lost server IP, trying UDP discovery...');
          this.initializeWithDiscovery().then((success) => {
            if (success) {
              this.performSimpleConnection(this.storedDeviceInfo);
            } else {
              // If discovery fails, schedule another reconnect
              this.scheduleSimpleReconnect();
            }
          });
        } else {
          // We have server IP, try direct connection
          this.performSimpleConnection(this.storedDeviceInfo);
        }
      } catch (error) {
        console.error('[Connection] Reconnection failed:', error);
        this.scheduleSimpleReconnect();
      }
    }, 500);
  }

  // ✅ STABLE: Stop reconnection
  private stopReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
  }



  // Restore all event listeners after reconnection
  private restoreEventListeners(): void {
    if (this.realtimeListeners.size === 0) return;

    console.log('[RECONNECT] Restoring event listeners...');

    for (const [event, callbacks] of this.realtimeListeners.entries()) {
      for (const callback of callbacks) {
        if (this.socket) {
          this.socket.on(event, callback);
        }
      }
    }

    console.log(`[RECONNECT] ✅ Restored ${this.realtimeListeners.size} event types`);
  }

  // Get connection quality info (simplified - no max delays)
  getConnectionQuality(): { connected: boolean; reconnectAttempts: number; lastConnectionTime: number } {
    return {
      connected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      lastConnectionTime: this.lastConnectionTime
    };
  }

  // Set up minimal real-time event handlers
  private setupRealtimeHandlers(): void {
    if (!this.socket) return;

    // Real-time updates (handled by listeners)
    this.socket.on('realtime:queue-update', (_data) => {});
    this.socket.on('ticket:new', (_data) => {});
    this.socket.on('ticket:status-update', (_data) => {});
    this.socket.on('device:connected', (_data) => {});
    this.socket.on('device:disconnected', (_data) => {});

    // Emergency broadcasts (show notifications)
    this.socket.on('emergency:alert', (data) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Emergency Alert', {
          body: data.message,
          icon: '/favicon.ico',
          requireInteraction: true
        });
      }
    });

    // Minimal ping/pong for connection monitoring
    this.socket.on('pong', (_data) => {});

    // Heartbeat every 60 seconds (longer interval)
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { clientTime: Date.now() });
      }
    }, 60000);
  }

  // Disconnect socket
  disconnectSocket() {
    this.disconnect();
  }

  // Check if socket is connected
  isSocketConnected(): boolean {
    return this.isConnected();
  }

  // Enhanced real-time methods for immediate updates
  async callTicketRealtime(ticketId: number, windowNumber: string): Promise<any> {
    try {
      console.log('[REALTIME] Calling ticket:', { ticketId, windowNumber });
      const response = await this.callTicket(ticketId, windowNumber);
      console.log('[REALTIME] ✅ Ticket called - server will emit event');
      return response;
    } catch (error) {
      console.error('[REALTIME] Error calling ticket:', error);
      throw error;
    }
  }

  async serveTicketRealtime(ticketId: number, windowNumber: string): Promise<any> {
    try {
      const response = await this.serveTicket(ticketId, windowNumber);

      // Emit real-time event immediately after successful serve
      this.emitRealtimeEvent('ticket:status-changed', {
        ticketId,
        oldStatus: 'called',
        newStatus: 'served',
        windowId: windowNumber,
        employeeId: this.deviceId
      });

      return response;
    } catch (error) {
      console.error('[REALTIME] Error serving ticket:', error);
      throw error;
    }
  }

  async createTicketRealtime(serviceId: number): Promise<any> {
    try {
      const response = await this.createTicket(serviceId);

      // Emit real-time event immediately after successful creation
      if (response && response.data) {
        this.emitRealtimeEvent('ticket:created', response.data);
      }

      return response;
    } catch (error) {
      console.error('[REALTIME] Error creating ticket:', error);
      throw error;
    }
  }

  // Request immediate updates (no caching)
  async getRealtimeQueueStatus(): Promise<any> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getRealtimeQueueStatus');

    if (this.socket && this.socket.connected) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Realtime request timeout'));
        }, 5000);

        this.socket!.once('queue-status', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        this.socket!.emit('get-queue-status');
      });
    } else {
      // Fallback to regular API
      return this.getTickets();
    }
  }

  async getRealtimeTicketsByService(serviceId: number): Promise<any> {
    // NEW: Block if not connected
    this.throwIfNotConnected('getRealtimeTicketsByService');

    if (this.socket && this.socket.connected) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Realtime request timeout'));
        }, 5000);

        this.socket!.once('tickets-by-service', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        this.socket!.emit('get-tickets-by-service', serviceId);
      });
    } else {
      // Fallback to regular API
      return this.getTickets();
    }
  }

  // Request browser notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Public getter for baseURL
  public getBaseURL(): string {
    return this.baseURL;
  }

  // Method to check if current server IP exists (trust UDP completely)
  public validateCurrentServerIP(): boolean {
    const currentInfo = this.getCurrentServerInfo();
    if (!currentInfo || !currentInfo.ip) {
      console.warn('[Connection] 🚫 No current server IP set');
      return false;
    }

    // Trust UDP discovery completely - any IP is valid
    console.log(`[Connection] ✅ Current server IP from UDP: ${currentInfo.ip}:${currentInfo.port}`);
    return true;
  }



  // ✅ SIMPLE SYSTEM VALIDATION: UDP-focused validation
  public async validateSystemConfiguration(): Promise<boolean> {
    console.log('[Connection] 🔍 Performing UDP-focused system validation...');

    // Check global window variables - trust UDP completely
    const globalServerIP = (window as any).SOCKET_SERVER_IP;

    if (globalServerIP) {
      console.log(`[Connection] ✅ Using UDP-discovered server IP: ${globalServerIP}`);
    }

    // Check base URL
    if (this.baseURL && this.baseURL.includes('localhost')) {
      console.warn(`[Connection] ⚠️ Base URL contains localhost: ${this.baseURL} - clearing...`);
      this.baseURL = '';
    }

    // If no server is set, attempt UDP discovery
    if (!globalServerIP) {
      console.log('[Connection] 🔄 No server configured, attempting UDP discovery...');
      const discoverySuccess = await this.initializeWithDiscovery();

      if (!discoverySuccess) {
        console.error('[Connection] 🚨 Failed to discover server via UDP');
        return false;
      }
    }

    console.log('[Connection] ✅ System configuration validated - using UDP-discovered server');
    return true;
  }

  // ✅ SIMPLE SERVER CONNECTION VALIDATION: UDP-based
  public async ensureValidServerConnection(): Promise<boolean> {
    console.log('[Connection] 🚀 Ensuring valid UDP-discovered server connection...');

    // First validate current configuration
    const configValid = await this.validateSystemConfiguration();

    if (!configValid) {
      console.error('[Connection] 🚨 Invalid server configuration detected');
      return false;
    }

    // Then check server health
    const serverHealthy = await this.checkServerHealth();

    if (!serverHealthy) {
      console.error('[Connection] 🚨 Server health check failed');
      return false;
    }

    console.log('[Connection] ✅ Valid UDP-discovered server connection established');
    return true;
  }



  // NEW: Check if system is functional (connected)
  private isSystemFullyFunctional(): boolean {
    return this.isConnected() && this.isSystemFunctional;
  }

  // ✅ NEVER BLOCK OPERATIONS: Allow all operations, connection will auto-reconnect
  private throwIfNotConnected(operation: string): void {
    // Don't throw errors, just log for debugging if needed
    if (!this.isSystemFullyFunctional() && process.env.NODE_ENV === 'development') {
      console.debug(`[${operation}] Operating while reconnecting...`);
    }
    // Never throw - let operations proceed, they will handle their own errors
  }

  // ✅ NEVER BLOCK SOCKET OPERATIONS: Allow all socket operations, connection will auto-reconnect
  private throwIfSocketNotConnected(operation: string): void {
    // Don't throw errors, just log for debugging if needed and try to reconnect
    if (!this.isConnected()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${operation}] Socket operation while reconnecting...`);
      }
      // Try to reconnect in background
      this.scheduleSimpleReconnect();
    }
    // Never throw - let operations proceed
  }

  // 🔥 NEW: Track logged operations to prevent spam
  private loggedOperations: Set<string> = new Set();
  private loggedSocketOperations: Set<string> = new Set();

  // Update main process with discovered server info
  private async updateMainProcessServerInfo(ip: string, port: number) {
    try {
      if (window.api?.updateServerInfo) {
        await window.api.updateServerInfo({ ip, port });
        console.log(`[AppServices] Updated main process with server info: ${ip}:${port}`);
      }
    } catch (error) {
      console.warn('[AppServices] Failed to update main process server info:', error);
    }
  }
}

// Export a singleton instance
const appServices = new AppServices();
export default appServices;
