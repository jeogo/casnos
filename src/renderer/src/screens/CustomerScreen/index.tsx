import React, { useEffect, useState, useRef } from 'react';
import appServices from '../../utils/appServices';
import printServices from '../../utils/printServices';
import APP_CONFIG from '../../config/appConfig';
import PrinterSelector from '../../components/PrinterSelector';
import { getDeviceInfo, DEVICE_NAMES, DEVICE_IDS } from '../../utils/deviceInfo';
import { autoRegisterDevice } from '../../utils/deviceRegistration';
import Logo from '../../components/Logo';

const RECONNECT_INTERVAL = APP_CONFIG.CONNECTION.RECONNECT_INTERVAL;

// Add these interfaces at the top of the file, after the imports
interface Service {
  id: number;
  name: string;
  [key: string]: any; // For any additional properties
}

interface Printer {
  id?: number;
  name: string;
  location?: string;
  device_id?: number;
  type?: 'server' | 'local';
  // Legacy field names for compatibility
  printer_id?: string;
  printer_name?: string;
  // For local printer properties
  driver?: string;
  port?: string;
  connection_type?: string;
  platform?: string;
}

const CustomerScreen: React.FC = () => {
  // Remove all connection UI states - silent background reconnection only
  const [services, setServices] = useState<Service[]>([]);
  // Note: ticket state removed - tickets are only printed, never displayed to customers
  const [ticketLoading, setTicketLoading] = useState(false);
  const [dbPrinters, setDbPrinters] = useState<Printer[]>([]);
  const [localPrinters, setLocalPrinters] = useState<any[]>([]);
  const [showPrinters, setShowPrinters] = useState(false);
  const [showPrinterSelector, setShowPrinterSelector] = useState(false);
  // الطابعة الافتراضية من localStorage
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => localStorage.getItem('defaultPrinter') || '');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  // Remove all connection UI states - silent background reconnection only
  const [servicesLoading, setServicesLoading] = useState(true); // Start as true since we'll fetch services immediately
  const socketRef = useRef<any>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const discoveryTimeout = useRef<NodeJS.Timeout | null>(null);  // Fetch available services
  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      console.log('[CUSTOMER] Fetching services from server...');
      const response = await appServices.getServices();
      // Handle both direct array and {data: array} response formats
      const servicesList = Array.isArray(response) ? response : ((response as any).data || []);
      setServices(servicesList);
      console.log('[CUSTOMER] ✅ Services loaded:', servicesList.length, servicesList);
    } catch (err) {
      console.error('[CUSTOMER] ❌ Error fetching services:', err);
      setServices([]);
    }
    setServicesLoading(false);
  };

  // Handle service selection
  const handleServiceSelection = async (serviceId: number) => {
    setSelectedServiceId(serviceId);

    // If no default printer is set, show a notification and open printer selector
    if (!selectedPrinter) {
      setShowPrinterSelector(true);
      return;
    }

    // Use the default printer
    await processTicketWithPrinter(selectedPrinter, serviceId);
  };

  // Handle printer selection from the printer selector
  const handlePrinterSelection = (printerId: string) => {
    // Save the selected printer as default
    setSelectedPrinter(printerId);
    localStorage.setItem('defaultPrinter', printerId);

    // If there was a pending service selection, process it now
    if (selectedServiceId) {
      processTicketWithPrinter(printerId, selectedServiceId);
    }

    setShowPrinterSelector(false);
  };

  // Process ticket with specified printer
  const processTicketWithPrinter = async (printerId: string, serviceId: number) => {
    if (!serviceId || !printerId) return;

    // Extract actual printer name from unique ID format (type:name)
    const actualPrinterName = printerId.includes(':') ? printerId.split(':', 2)[1] : printerId;

    setTicketLoading(true);
    try {
      // Create the ticket
      const ticketResult = await window.api.createRealTicket(serviceId, actualPrinterName);

      if (!ticketResult.success) {
        console.error('[CUSTOMER] ❌ Failed to create ticket:', ticketResult.error);
        return;
      }

      const realTicketData = {
        ticket_number: ticketResult.ticket.ticket_number,
        service_name: ticketResult.ticket.service_name,
        created_at: ticketResult.ticket.created_at,
        printer_id: actualPrinterName,
        company_name: 'نظام إدارة الطوابير',
        position: ticketResult.ticket.position,
        window_number: ticketResult.ticket.window_number,
        service_id: serviceId,
        id: ticketResult.ticket.id,
        status: 'pending',
        print_source: 'customer'
      };

      // Note: We don't show the ticket to the customer - it's only printed
      // The ticket display has been removed for better customer experience

      // Print using smart print system with stored printer
      await printServices.smartPrint(realTicketData, {
        printerName: actualPrinterName,
        silent: true
      });
      console.log('[CUSTOMER] ✅ Ticket processed successfully with printer:', printerId);

    } catch (err) {
      console.error('[CUSTOMER] ❌ Error processing ticket:', err);
    } finally {
      setTicketLoading(false);
      setSelectedServiceId(null);
    }
  };

  // Fetch printers from DB (server printers)
  const fetchDbPrinters = async () => {
    try {
      console.log('[CUSTOMER] Fetching server printers...');
      const printersList = await appServices.getServerPrinters();
      setDbPrinters(Array.isArray(printersList) ? printersList : []);
      console.log('[CUSTOMER] ✅ Server printers loaded:', Array.isArray(printersList) ? printersList.length : 0, printersList);
    } catch (err) {
      console.error('[CUSTOMER] ❌ Error fetching server printers:', err);
      setDbPrinters([]);
    }
  };

  // Fetch local system printers
  const fetchLocalPrinters = async () => {
    try {
      console.log('[CUSTOMER] Fetching local system printers via Electron IPC...');
      const printers = await appServices.getLocalPrinters();
      setLocalPrinters(printers || []);
      console.log('[CUSTOMER] ✅ Local printers loaded:', (printers || []).length, printers);
    } catch (err) {
      console.error('[CUSTOMER] ❌ Error fetching local printers:', err);
      setLocalPrinters([]);
    }
  };

  // Fetch printers when printer selector is opened
  React.useEffect(() => {
    if (showPrinterSelector) {
      fetchDbPrinters();
      fetchLocalPrinters();
    }
    // No cleanup needed
  }, [showPrinterSelector]);

  // Socket connection
  // Socket connection with realtime events support
  const connectSocket = async () => {
    if (appServices.isConnected()) {
      console.log('[CUSTOMER] Socket already connected, skipping reconnect');
      return;
    }

    console.log('[CUSTOMER] Connecting to socket server...');

    try {
      // Get device info automatically and simply
      const deviceInfo = await getDeviceInfo('customer', DEVICE_NAMES.customer, DEVICE_IDS.customer);
      console.log('[CUSTOMER] 📋 Device info prepared:', deviceInfo);

      const socket = appServices.connectSocket(deviceInfo);
      socketRef.current = socket;

      socket.on('connect', async () => {
        console.log('[CUSTOMER] Socket connected successfully');

        // Register device automatically with retry
        try {
          const registrationResult = await autoRegisterDevice(deviceInfo);
          if (registrationResult.success) {
            console.log('[CUSTOMER] ✅ Device registration completed:', registrationResult);
          } else {
            console.warn('[CUSTOMER] ⚠️ Device registration failed (continuing anyway):', registrationResult.message);
          }
        } catch (err) {
          console.warn('[CUSTOMER] ⚠️ Device registration error (continuing anyway):', err);
        }

        // Setup realtime event listeners for instant updates
        setupRealtimeEventListeners();

        try {
          // Fetch initial data after successful socket connection
          await Promise.all([
            fetchServices(),
            fetchDbPrinters(),
            fetchLocalPrinters()
          ]);
          console.log('[CUSTOMER] Initial data loaded successfully');
        } catch (err) {
          console.error('[CUSTOMER] Error loading initial data:', err);
        }

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      });

      socket.on('disconnect', () => {
        console.log('[CUSTOMER] Socket disconnected');
        cleanupRealtimeEventListeners();
        attemptReconnect();
      });

      socket.on('connect_error', (error) => {
        console.log('[CUSTOMER] Socket connection error:', error);
        attemptReconnect();
      });

      // Listen for system reset notification
      socket.on('system-reset', () => {
        console.log('[CUSTOMER] 🔄 System reset detected - clearing local cache...');

        // Clear any localStorage cache (if used)
        try {
          // Clear customer-specific cache
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('customer-') || key.startsWith('device-') || key.startsWith('ticket-')) {
              localStorage.removeItem(key);
            }
          });
          console.log('[CUSTOMER] ✅ Local cache cleared');
        } catch (err) {
          console.error('[CUSTOMER] ❌ Error clearing cache:', err);
        }

        // Reset component state
        setServices([]);
        setSelectedServiceId(null);
        // Note: ticket state removed - tickets are only printed, never displayed
        setSelectedPrinter('');
        setShowPrinterSelector(false);

        // Reconnect after reset
        setTimeout(() => {
          console.log('[CUSTOMER] 🔄 Reconnecting after system reset...');
          window.location.reload(); // Full refresh to ensure clean state
        }, 2000);
      });

    } catch (error) {
      console.error('[CUSTOMER] ❌ Error getting device info:', error);
      attemptReconnect();
    }
  };

  // Setup realtime event listeners for instant updates (no notifications)
  const setupRealtimeEventListeners = () => {
    console.log('[CUSTOMER] 🔄 Setting up realtime event listeners');

    // Service events - instant local state updates
    appServices.onRealtimeEvent('service:created', async (data) => {
      console.log('[CUSTOMER] 🆕 Realtime: Service created', data);
      setServices(prev => [...prev, data]);
      console.log('[CUSTOMER] ✅ Service added to local state instantly');
    });

    appServices.onRealtimeEvent('service:updated', async (data) => {
      console.log('[CUSTOMER] ✏️ Realtime: Service updated', data);
      setServices(prev => prev.map(s => s.id === data.id ? data : s));
      console.log('[CUSTOMER] ✅ Service updated in local state instantly');
    });

    appServices.onRealtimeEvent('service:deleted', async (data) => {
      console.log('[CUSTOMER] 🗑️ Realtime: Service deleted', data);
      setServices(prev => prev.filter(s => s.id !== data.id));
      console.log('[CUSTOMER] ✅ Service removed from local state instantly');
    });

    // Emergency events
    appServices.onRealtimeEvent('emergency:activated', (data) => {
      console.log('[CUSTOMER] 🚨 Realtime: Emergency activated', data);
    });

    appServices.onRealtimeEvent('emergency:cleared', (data) => {
      console.log('[CUSTOMER] ✅ Realtime: Emergency cleared', data);
    });

    console.log('[CUSTOMER] ✅ Realtime event listeners setup complete');
  };

  // Cleanup realtime event listeners
  const cleanupRealtimeEventListeners = () => {
    console.log('[CUSTOMER] 🧹 Cleaning up realtime event listeners');

    const events = [
      'service:created', 'service:updated', 'service:deleted',
      'emergency:activated', 'emergency:cleared'
    ];

    events.forEach(event => {
      appServices.offRealtimeEvent(event);
    });
  };

  const attemptReconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    reconnectTimeout.current = setTimeout(() => {
      connectSocket();
    }, RECONNECT_INTERVAL);
  };

  useEffect(() => {
    // Start immediate connection with UDP discovery
    const initializeConnection = async () => {
      try {
        console.log('[CUSTOMER] 🚀 Starting UDP discovery and connection...');

        // Discover and connect immediately
        const serverDiscovered = await appServices.initializeWithDiscovery();
        if (serverDiscovered) {
          await connectSocket();
        } else {
          // Keep retrying in background automatically
          console.log('[CUSTOMER] ⏳ Will keep retrying UDP discovery...');
        }
      } catch (error) {
        console.error('[CUSTOMER] Connection error, will retry:', error);
      }
    };

    initializeConnection();

    return () => {
      appServices.disconnect();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (discoveryTimeout.current) clearTimeout(discoveryTimeout.current);
    };
    // eslint-disable-next-line
  }, []);

  // Silent background reconnection monitoring
  useEffect(() => {
    const reconnectInterval = setInterval(() => {
      if (!appServices.isConnected()) {
        // Silent reconnection attempt - no logging
        connectSocket();
      }
    }, 5000); // Every 5 seconds, silently

    return () => clearInterval(reconnectInterval);
  }, []);

  // REMOVED: No more connection error screens - always show main interface

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 p-4 overflow-hidden relative">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <Logo size="lg" position="left" />
      </div>

      <div className="w-full h-full flex flex-col">
        {/* Header with Title */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0 bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">🎫 CASNOS Customer Screen</h1>
              <p className="text-sm text-gray-600">Queue Management System</p>
            </div>
          </div>
          {/* Printer Status Button */}
          <button
            onClick={() => setShowPrinterSelector(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shadow-sm transition-colors group relative"
          >
          <div className="text-right">
            <div className="text-sm text-gray-500 font-medium">Printer</div>
            {selectedPrinter ? (
              <div className="text-sm font-semibold text-blue-600 truncate max-w-[200px]">
                {selectedPrinter}
              </div>
            ) : (
              <div className="text-xs text-orange-500 font-medium">
                Not selected
              </div>
            )}
          </div>
          <span className="text-xl border-l border-gray-300 pl-2 group-hover:transform group-hover:scale-110 transition-transform">🖨️</span>
        </button>
      </div>

      {/* REMOVED: Connection status display - all connection logic is silent now */}

      {showPrinters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowPrinters(false)}>
          <div className="bg-white rounded-lg p-6 min-w-[400px] max-w-[600px] max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mt-0 text-blue-600 text-center">Printer Information</h3>

            {/* Server Printers Section */}
            <div className="mb-5">
              <h4 className="text-blue-600 border-b-2 border-blue-600 pb-1 mb-3 font-semibold">
                🖥️ Server Printers ({dbPrinters.length})
              </h4>
              {dbPrinters.length === 0 ? (
                <p className="text-gray-500 italic my-3">No server printers configured</p>
              ) : (
                <ul className="pl-5 my-3">
                  {dbPrinters.map((p, i) => (
                    <li key={i} className="mb-1">
                      <span className="font-semibold text-gray-800">{p.name || p.printer_name}</span>
                      <div className="text-xs text-gray-600 ml-3">
                        ID: {p.id || p.printer_id}
                        {((p.name || p.printer_name || '').toLowerCase().includes('network') ||
                          (p.id || p.printer_id || '').toString().toLowerCase().includes('network')) && (
                          <span className="text-blue-600 font-semibold"> • Network Printer</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Local System Printers Section */}
            <div className="mb-5">
              <h4 className="text-orange-500 border-b-2 border-orange-500 pb-1 mb-3 font-semibold">
                🖨️ Local System Printers ({localPrinters.length})
              </h4>
              {localPrinters.length === 0 ? (
                <p className="text-gray-500 italic my-3">No local printers detected</p>
              ) : (
                <ul className="pl-5 my-3">
                  {localPrinters.map((p, i) => (
                    <li key={i} className="mb-2">
                      <span className="font-semibold text-gray-800">{p.name}</span>
                      <div className="text-xs text-gray-600 ml-3">
                        <div>Type: {p.type || 'Unknown'}</div>
                        {p.driver && <div>Driver: {p.driver}</div>}
                        {p.port && <div>Port: {p.port}</div>}
                        <div>
                          Connection:
                          <span className={`font-semibold ml-1 ${
                            p.connection_type === 'usb' ? 'text-green-500' : 'text-orange-500'
                          }`}>
                            {p.connection_type?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Platform: {p.platform || 'Unknown'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="text-center pt-3 border-t border-gray-200">
              <button
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                onClick={() => setShowPrinters(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-lg text-gray-800 my-4 font-semibold">Available Services</h2>
      <div className="mb-4 flex flex-wrap gap-3 justify-center">
        {servicesLoading ? (
          <div className="text-blue-600 py-5 text-center w-full">
            <div>🔄 Loading services...</div>
            <div className="text-xs text-gray-600 mt-2">
              Fetching data from server
            </div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-gray-500 italic py-5 text-center w-full">
            <div>⚠️ No services available</div>
            <div className="text-xs mt-2">
              Check server connection and database
            </div>
          </div>
        ) : (
          <>
            <div className="w-full text-center text-xs text-gray-600 mb-3">
              Found {services.length} services
            </div>
            {services.map((service: Service) => (
              <button
                key={service.id}
                className={`px-7 py-4 rounded-lg border-none text-white font-bold text-base mb-2 shadow-md min-w-36 transition-all duration-200 ${
                  ticketLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 cursor-pointer'
                }`}
                onClick={() => !ticketLoading && handleServiceSelection(service.id)}
                disabled={ticketLoading}
              >
                {service.name}
              </button>
            ))}
          </>
        )}
      </div>
      {/* Ticket display removed - tickets are only printed, never shown to customers */}
      {ticketLoading && (
        <div className="text-center text-blue-600 text-sm mt-3">
          🎫 Processing your ticket...
        </div>
      )}

      {/* Printer Selector Modal */}
      {/* زر لتغيير الطابعة الافتراضية */}
      {showPrinterSelector && (
        <PrinterSelector
          printers={[
            ...dbPrinters.map(p => ({ ...p, type: 'server' as const, source: 'system' })),
            ...localPrinters.map(p => ({ ...p, type: 'local' as const, source: 'electron' }))
          ]}
          selectedPrinter={selectedPrinter}
          onPrinterSelect={handlePrinterSelection}
          onClose={() => {
            setShowPrinterSelector(false);
            setSelectedServiceId(null);
          }}
          loading={ticketLoading}
        />
      )}
      </div>
    </div>
  );
};

export default CustomerScreen;

