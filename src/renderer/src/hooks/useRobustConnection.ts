import { useEffect, useRef, useState, useCallback } from 'react';
import appServices from '../utils/appServices';

interface ConnectionStatus {
  status: 'discovering' | 'connecting' | 'connected' | 'disconnected' | 'error';
  serverReady: boolean;
  error: string | null;
  reconnectAttempts: number;
  isReconnecting: boolean;
}

interface UseRobustConnectionOptions {
  deviceInfo?: any;
  autoConnect?: boolean;
  aggressiveReconnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for robust, automatic reconnection to the CASNOS server
 * Handles discovery, connection, and automatic reconnection with advanced fallback strategies
 */
export const useRobustConnection = (options: UseRobustConnectionOptions = {}) => {
  const {
    deviceInfo,
    autoConnect = true,
    aggressiveReconnect = true,
    onConnected,
    onDisconnected,
    onError
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionStatus>({
    status: 'discovering',
    serverReady: false,
    error: null,
    reconnectAttempts: 0,
    isReconnecting: false
  });

  const socketRef = useRef<any>(null);
  const discoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  // Clear all timers on unmount
  const clearTimers = useCallback(() => {
    if (discoveryTimeoutRef.current) {
      clearTimeout(discoveryTimeoutRef.current);
      discoveryTimeoutRef.current = null;
    }
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  }, []);

  // Connect to socket with robust error handling
  const connectSocket = useCallback(async (): Promise<boolean> => {
    if (isConnectingRef.current || appServices.isConnected()) {
      console.log('[RobustConnection] Already connecting or connected, skipping...');
      return appServices.isConnected();
    }

    isConnectingRef.current = true;
    setConnectionState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      console.log('[RobustConnection] 🔄 Attempting socket connection...');

      const socket = appServices.connectSocket(deviceInfo);
      socketRef.current = socket;

      socket.on('connect', async () => {
        console.log('[RobustConnection] ✅ Socket connected successfully');
        isConnectingRef.current = false;

        setConnectionState(prev => ({
          ...prev,
          status: 'connected',
          serverReady: true,
          error: null,
          reconnectAttempts: 0,
          isReconnecting: false
        }));

        onConnected?.();
        startConnectionMonitoring();
      });

      socket.on('disconnect', (reason) => {
        console.log(`[RobustConnection] ❌ Socket disconnected: ${reason}`);
        isConnectingRef.current = false;

        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          serverReady: false,
          isReconnecting: aggressiveReconnect
        }));

        onDisconnected?.();

        // Automatic reconnection for non-intentional disconnects
        if (reason !== 'io client disconnect' && aggressiveReconnect) {
          console.log('[RobustConnection] 🔄 Auto-reconnecting after disconnect...');
          // Let appServices handle the fast reconnection
          // This hook will detect the reconnection through monitoring
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[RobustConnection] ❌ Socket connection error:', error);
        isConnectingRef.current = false;

        const errorMessage = error?.message || 'Connection failed';
        setConnectionState(prev => ({
          ...prev,
          status: 'error',
          serverReady: false,
          error: errorMessage,
          isReconnecting: aggressiveReconnect
        }));

        onError?.(errorMessage);

        // Let appServices handle reconnection attempts
      });

      return true;

    } catch (error) {
      console.error('[RobustConnection] ❌ Socket connection failed:', error);
      isConnectingRef.current = false;

      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        serverReady: false,
        error: errorMessage,
        isReconnecting: aggressiveReconnect
      }));

      onError?.(errorMessage);
      return false;
    }
  }, [deviceInfo, aggressiveReconnect, onConnected, onDisconnected, onError]);

  // Discover server and initiate connection
  const discoverAndConnect = useCallback(async (): Promise<boolean> => {
    console.log('[RobustConnection] 🔍 Starting server discovery...');
    setConnectionState(prev => ({ ...prev, status: 'discovering', error: null }));

    try {
      const res = await appServices.getServerInfo();

      if (res && res.ip) {
        console.log(`[RobustConnection] ✅ Server discovered at ${res.ip}:${res.port || 3001}`);

        // Set global server info
        (window as any).SOCKET_SERVER_IP = res.ip;
        (window as any).SOCKET_SERVER_PORT = res.port || 3001;

        // Clear discovery timeout
        if (discoveryTimeoutRef.current) {
          clearTimeout(discoveryTimeoutRef.current);
          discoveryTimeoutRef.current = null;
        }

        // Connect to discovered server
        return await connectSocket();
      } else {
        console.log('[RobustConnection] ⏳ Server not discovered yet, retrying...');

        // Retry discovery with exponential backoff
        discoveryTimeoutRef.current = setTimeout(() => {
          discoverAndConnect();
        }, 2000);

        return false;
      }
    } catch (error) {
      console.error('[RobustConnection] ❌ Discovery error:', error);

      const errorMessage = `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));

      // Retry discovery after error
      discoveryTimeoutRef.current = setTimeout(() => {
        discoverAndConnect();
      }, 5000);

      return false;
    }
  }, [connectSocket]);

  // Start monitoring connection status
  const startConnectionMonitoring = useCallback(() => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      const appStatus = appServices.getConnectionStatus();

      setConnectionState(prev => {
        const updatedState = {
          ...prev,
          reconnectAttempts: appStatus.attempts,
          isReconnecting: appStatus.reconnecting
        };

        // Update status based on actual connection state
        if (appStatus.connected && prev.status !== 'connected') {
          return {
            ...updatedState,
            status: 'connected' as const,
            serverReady: true,
            error: null,
            isReconnecting: false
          };
        } else if (!appStatus.connected && prev.status === 'connected') {
          return {
            ...updatedState,
            status: 'disconnected' as const,
            serverReady: false,
            isReconnecting: aggressiveReconnect
          };
        }

        return updatedState;
      });
    }, 1000); // Monitor every second
  }, [aggressiveReconnect]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    console.log('[RobustConnection] 🔄 Forcing reconnection...');
    appServices.forceReconnect();
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    if (autoConnect) {
      discoverAndConnect();
      startConnectionMonitoring();
    }

    return () => {
      clearTimers();
      appServices.disconnect();
    };
  }, [autoConnect, discoverAndConnect, startConnectionMonitoring, clearTimers]);

  return {
    ...connectionState,
    connectSocket,
    discoverAndConnect,
    forceReconnect,
    isConnected: appServices.isConnected(),
    clearTimers
  };
};

export default useRobustConnection;
