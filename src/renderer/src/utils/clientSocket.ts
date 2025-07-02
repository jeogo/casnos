import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// Function to get a socket.io-client connection
export function getSocketConnection(serverUrl: string, options?: any): Socket {
  return io(serverUrl, options);
}

// API client that always uses the discovered server IP (NEVER LOCALHOST)
export const apiClient = {
  get baseUrl() {
    const ip = (window as any).SOCKET_SERVER_IP;
    const port = (window as any).SOCKET_SERVER_PORT || 3001;
    
    if (!ip) throw new Error('Server IP not discovered yet');
    
    // Validate IP to ensure it's not localhost
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
      throw new Error(`Invalid server IP: ${ip}. Localhost addresses are not allowed.`);
    }
    
    // Validate IPv4 format
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(ip)) {
      throw new Error(`Invalid IPv4 address: ${ip}`);
    }
    
    return `http://${ip}:${port}`;
  },
  get: (path: string, config?: any) => axios.get(apiClient.baseUrl + path, config),
  post: (path: string, data?: any, config?: any) => axios.post(apiClient.baseUrl + path, data, config),
  put: (path: string, data?: any, config?: any) => axios.put(apiClient.baseUrl + path, data, config),
  patch: (path: string, data?: any, config?: any) => axios.patch(apiClient.baseUrl + path, data, config),
  delete: (path: string, config?: any) => axios.delete(apiClient.baseUrl + path, config),
};

