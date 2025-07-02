import React, { useEffect, useState, useRef } from 'react';
import appServices from '../../utils/appServices';
import APP_CONFIG from '../../config/appConfig';
import { displayPrintProcessor } from '../../utils/displayPrintProcessor';
import { getDeviceInfo, DEVICE_NAMES, DEVICE_IDS } from '../../utils/deviceInfo';
import { autoRegisterDevice } from '../../utils/deviceRegistration';
import { audioPlayer } from '../../utils/audioPlayer';
import Logo from '../../components/Logo';

const RECONNECT_INTERVAL = APP_CONFIG.CONNECTION.RECONNECT_INTERVAL;

// Interfaces
interface Ticket {
  id: number;
  ticket_number: string;
  service_id: number;
  service_name: string;
  status: 'pending' | 'called' | 'served';
  created_at: string;
  called_at: string | null;
  window_label: string | null;
  printer_id: string | null;
}

const DisplayScreen: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const socketRef = useRef<any>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  // قائمة انتظار المناداة الصوتية
  const audioQueue = useRef<any[]>([]);
  const isAudioPlaying = useRef(false);
  const [showTicketOverlay, setShowTicketOverlay] = useState(false);

  // تهيئة النظام الصوتي
  useEffect(() => {
    // Initializing audio system
    try {
      // التأكد من تهيئة audioPlayer
      if (audioPlayer) {
        console.log('[DISPLAY] ✅ Audio player is available and ready');
      } else {
        console.error('[DISPLAY] ❌ Audio player is not available!');
      }
    } catch (error) {
      console.error('[DISPLAY] ❌ Error initializing audio system:', error);
    }
  }, []);

  // Fetch all tickets
  const fetchTickets = async () => {
    try {
      // Fetching tickets from server
      const response = await appServices.getTickets();
      const ticketsList = Array.isArray(response) ? response : ((response as any).data || []);
      setTickets(ticketsList);
      // Tickets loaded successfully
    } catch (err) {
      console.error('[DISPLAY] ❌ Error fetching tickets:', err);
      setTickets([]);
    }
  };

  // Socket connection
  // Socket connection with realtime events support
  const connectSocket = async () => {
    if (appServices.isConnected()) {
      console.log('[DISPLAY] Socket already connected, skipping reconnect');
      return;
    }

    try {
      // Get device info automatically and simply
      const deviceInfo = await getDeviceInfo('display', DEVICE_NAMES.display, DEVICE_IDS.display);
      console.log('[DISPLAY] 📋 Device info prepared:', deviceInfo);

      const socket = appServices.connectSocket(deviceInfo);
      socketRef.current = socket;

      socket.on('connect', async () => {
        console.log('[DISPLAY] Socket connected successfully');

        try {
          // Initialize print processor for network printing
          displayPrintProcessor.initialize(socket);
          console.log('[DISPLAY] 🖨️ Print processor initialized');

          // Cleanup on disconnect
          socket.on('disconnect', () => {
            console.log('[DISPLAY] Socket disconnected');
          });

          // Register device automatically with retry
          try {
            const registrationResult = await autoRegisterDevice(deviceInfo);
            if (registrationResult.success) {
              console.log('[DISPLAY] ✅ Device registration completed:', registrationResult);
            } else {
              console.warn('[DISPLAY] ⚠️ Device registration failed (continuing anyway):', registrationResult.message);
            }
          } catch (err) {
            console.warn('[DISPLAY] ⚠️ Device registration error (continuing anyway):', err);
          }

          // Setup realtime event listeners for instant updates
          setupRealtimeEventListeners();

          // Fetch initial data after successful socket connection
          try {
            await fetchTickets();
            console.log('[DISPLAY] Initial data loaded successfully');
          } catch (err) {
            console.error('[DISPLAY] Error loading initial data:', err);
          }
        } catch (err) {
          console.error('[DISPLAY] Error during initialization:', err);
        }

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      });

      socket.on('disconnect', () => {
        console.log('[DISPLAY] Socket disconnected');
        cleanupRealtimeEventListeners();
        attemptReconnect();
      });

      socket.on('connect_error', (error) => {
        console.error('[DISPLAY] Socket connection error:', error);
        attemptReconnect();
      });

      // Listen for system reset notification
      socket.on('system-reset', () => {
        // Clear any localStorage cache (if used)
        try {
          // Clear display-specific cache
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('display-') || key.startsWith('device-') || key.startsWith('ticket-')) {
              localStorage.removeItem(key);
            }
          });
        } catch (err) {
          // Error clearing cache
        }

        // Reset component state
        setTickets([]);
        setCurrentTicket(null);

        // Reconnect after reset
        setTimeout(() => {
          window.location.reload(); // Full refresh to ensure clean state
        }, 2000);
      });

    } catch (error) {
      console.error('[DISPLAY] Connection error:', error);
      attemptReconnect();
    }
  };  // Setup realtime event listeners for instant updates (no notifications)
  const setupRealtimeEventListeners = () => {
    // Listen for print status updates (printed, print_failed)
    appServices.onRealtimeEvent('print-status-updated', (data) => {
      console.log('[DISPLAY] 🖨️ print-status-updated', data);
      const updatedTicket = data.ticket;
      if (!updatedTicket) return;
      setTickets(prev => {
        const exists = prev.some(t => t.id === updatedTicket.id);
        if (exists) {
          return prev.map(t => t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t);
        } else {
          return [updatedTicket, ...prev];
        }
      });
    });
    // Listen for ticket:updated to handle real-time completion
    appServices.onRealtimeEvent('ticket:updated', (data) => {
      console.log('[DISPLAY] 🔄 ticket:updated', data);
      setTickets(prev => {
        const exists = prev.some(t => t.id === data.id);
        if (exists) {
          // Update the ticket
          return prev.map(t => t.id === data.id ? data : t);
        } else {
          // Add the ticket to the list (in case it was missing)
          return [data, ...prev];
        }
      });
    });
    // Listen for ticket status updates (e.g., served, called, etc.)
    appServices.onRealtimeEvent('ticket:status-update', async (data) => {
      console.log('[DISPLAY] 🔄 ticket:status-update', data);
      const { ticketId, newStatus } = data;
      setTickets(prev => {
        const idx = prev.findIndex(t => t.id === ticketId);
        if (idx !== -1) {
          // Update status only
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: newStatus };
          return updated;
        } else {
          // Fetch ticket from backend and add it
          appServices.getTicketById && appServices.getTicketById(ticketId).then(ticket => {
            if (ticket) {
              setTickets(current => [ticket, ...current]);
            }
          });
          return prev;
        }
      });
    });
    console.log('[DISPLAY] 🔄 Setting up realtime event listeners');

    // Listen for both 'ticket:new' and 'ticket:created' for maximum compatibility
    const handleNewTicket = (data: any) => {
      console.log('[DISPLAY] 🎫 Realtime: New ticket created', data);
      setTickets(prev => [data.ticket || data, ...prev]);
    };
    appServices.onRealtimeEvent('ticket:created', handleNewTicket);
    appServices.onRealtimeEvent('ticket:new', handleNewTicket);

    // 🔊 مناداة صوتية متسلسلة (Queue)
    appServices.onRealtimeEvent('ticket:called', (data) => {
      console.log('[DISPLAY] 📢 Ticket called:', data);
      // أضف التذكرة إلى قائمة الانتظار
      audioQueue.current.push(data);
      setTickets(prev => prev.map(t => t.id === data.id ? data : t));
      // إذا لم يكن هناك صوت قيد التشغيل، ابدأ التشغيل
      if (!isAudioPlaying.current) {
        playNextAudioInQueue();
      }
    });

    // دالة تشغيل الصوت للتذكرة الأولى في قائمة الانتظار
    async function playNextAudioInQueue() {
      if (audioQueue.current.length === 0) {
        isAudioPlaying.current = false;
        setShowTicketOverlay(false);
        console.log('[DISPLAY] 🔊 Audio queue empty, stopping');
        return;
      }
      isAudioPlaying.current = true;
      const ticketData = audioQueue.current.shift();
      setCurrentTicket(ticketData);
      setShowTicketOverlay(true); // Show ticket overlay during audio

      console.log('[DISPLAY] 🔊 Playing audio for ticket:', ticketData.ticket_number, 'Window:', ticketData.window_label);

      if (audioPlayer) {
        try {
          await audioPlayer.playAnnouncement(ticketData.ticket_number, ticketData.window_label || 'الشباك 1');
          console.log('[DISPLAY] ✅ Audio playback completed for ticket:', ticketData.ticket_number);
        } catch (error) {
          console.error('[DISPLAY] ❌ Audio playback failed for ticket:', ticketData.ticket_number, error);
          // تجاهل الخطأ، أكمل التسلسل
        }
      } else {
        console.error('[DISPLAY] ❌ Audio player not available!');
      }
      // بعد انتهاء الصوت، انتقل للتذكرة التالية
      setTimeout(() => {
        setShowTicketOverlay(false); // Hide overlay after audio ends
        playNextAudioInQueue();
      }, 1000); // Small delay to ensure audio completion
    }

    appServices.onRealtimeEvent('ticket:served', (data) => {
      console.log('[DISPLAY] ✅ Realtime: Ticket served', data);
      setTickets(prev => {
        // Check if ticket exists in the list
        const exists = prev.some(t => t.id === data.id);
        if (exists) {
          // Update the ticket
          return prev.map(t => t.id === data.id ? data : t);
        } else {
          // Add the ticket to the list (in case it was missing)
          return [data, ...prev];
        }
      });
    });

    // Emergency events
    appServices.onRealtimeEvent('emergency:activated', (data) => {
      console.log('[DISPLAY] 🚨 Realtime: Emergency activated', data);
    });

    appServices.onRealtimeEvent('emergency:cleared', (data) => {
      console.log('[DISPLAY] ✅ Realtime: Emergency cleared', data);
    });

    // Queue status updates (every 5 seconds)
    appServices.onRealtimeEvent('queue:status', (data) => {
      console.log('[DISPLAY] 📊 Realtime: Queue status update', data);
      if (data.tickets) {
        setTickets(data.tickets);
      }
    });

    console.log('[DISPLAY] ✅ Realtime event listeners setup complete');
  };

  // Cleanup realtime event listeners
  const cleanupRealtimeEventListeners = () => {
    console.log('[DISPLAY] 🧹 Cleaning up realtime event listeners');

    const events = [
      'ticket:created', 'ticket:new', 'ticket:called', 'ticket:served',
      'service:created', 'service:updated', 'service:deleted',
      'emergency:activated', 'emergency:cleared',
      'queue:status'
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
    // Start connection process immediately - simplified approach
    const initializeDisplay = async () => {
      console.log('[DISPLAY] 🚀 Starting display initialization...');

      // Start discovery and connection process
      try {
        const success = await appServices.initializeWithDiscovery();
        if (success) {
          console.log('[DISPLAY] ✅ Server discovered, connecting socket');
          connectSocket();
        } else {
          console.log('[DISPLAY] ⏳ Server not found yet, retrying...');
          // Retry after a delay
          setTimeout(initializeDisplay, 2000);
        }
      } catch (error) {
        console.error('[DISPLAY] Initialization error:', error);
        // Retry after a delay
        setTimeout(initializeDisplay, 2000);
      }
    };

    initializeDisplay();

    return () => {
      appServices.disconnect();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, []);


  // Background effect: Register local printers with backend after server is ready, with retry if not found
  useEffect(() => {
    let cancelled = false;
    let retryTimeout: NodeJS.Timeout | null = null;

    const tryRegisterPrinters = async () => {
      if (cancelled) return;
      try {
        const printers = await (window as any).api?.getLocalPrinters?.();
        if (!Array.isArray(printers) || printers.length === 0) {
          // No printers found, retry after 10 seconds
          if (!cancelled) retryTimeout = setTimeout(tryRegisterPrinters, 10000);
          return;
        }

        const deviceInfo = await getDeviceInfo('display', DEVICE_NAMES.display, DEVICE_IDS.display);
        const deviceStringId = deviceInfo?.device_id;
        if (!deviceStringId) {
          if (!cancelled) retryTimeout = setTimeout(tryRegisterPrinters, 10000);
          return;
        }

        let deviceNumericId: number | null = null;
        try {
          const deviceRes = await fetch(`${appServices.getBaseURL()}/api/devices/device-id/${deviceStringId}`);
          if (deviceRes.ok) {
            const deviceData = await deviceRes.json();
            deviceNumericId = deviceData?.data?.id || null;
          }
        } catch {}
        if (!deviceNumericId) {
          if (!cancelled) retryTimeout = setTimeout(tryRegisterPrinters, 10000);
          return;
        }

        const uniquePrinters = Array.from(new Map(printers.map(p => [p.name, p])).values());
        for (const printer of uniquePrinters) {
          if (cancelled) return;
          try {
            const printerPayload = {
              printer_id: printer.name,
              printer_name: printer.name
            };
            const url = `${appServices.getBaseURL()}/api/devices/${deviceNumericId}/printers`;
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(printerPayload)
            });
          } catch {}
        }
        // Success: printers registered, do not retry
      } catch {
        if (!cancelled) retryTimeout = setTimeout(tryRegisterPrinters, 10000);
      }
    };
    tryRegisterPrinters();
    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Silent background reconnection monitoring
  useEffect(() => {
    if (status === 'disconnected' || status === 'error') {
      const reconnectInterval = setInterval(() => {
        if (!appServices.isConnected()) {
          // Silent reconnection attempt - no logging
          connectSocket();
        }
      }, 5000); // Every 5 seconds, silently
      return () => clearInterval(reconnectInterval);
    }

    return () => {
      // No cleanup needed
    };
  }, [status]);

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const calledTickets = tickets.filter(t => t.status === 'called');

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 p-4 font-sans overflow-hidden relative">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <Logo size="lg" position="left" />
      </div>

      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-center text-blue-600 text-3xl font-bold">
              🖥️ CASNOS Display Screen
            </h1>
          </div>
        </div>

        {/* Ticket Overlay for Audio Announcements */}
        {showTicketOverlay && currentTicket && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white p-20 rounded-3xl text-center shadow-2xl border-8 border-white max-w-4xl mx-4">
              <h2 className="m-0 mb-8 text-6xl font-bold animate-pulse">🎫 الآن يتم استدعاء</h2>
              <div className="text-9xl font-black my-8 tracking-wider drop-shadow-lg">
                #{currentTicket.ticket_number}
              </div>
              <div className="text-4xl my-6 font-semibold bg-white/20 rounded-lg py-4 px-8 inline-block">
                {currentTicket.service_name}
              </div>
              <div className="text-3xl opacity-90 mt-6">
                يرجى التوجه إلى <span className="font-bold text-yellow-300">{currentTicket.window_label || 'مكتب الخدمة'}</span>
              </div>
            </div>
          </div>
        )}        {/* Current Ticket Display - Hidden during audio */}
        {!showTicketOverlay && currentTicket && (
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white p-6 rounded-2xl text-center mb-4 shadow-2xl border-4 border-white flex-shrink-0">
            <h2 className="m-0 mb-2 text-3xl font-bold animate-pulse">🎫 NOW SERVING</h2>
            <div className="text-6xl font-black my-4 tracking-wider drop-shadow-lg">
              #{currentTicket.ticket_number}
            </div>
            <div className="text-xl my-2 font-semibold bg-white/20 rounded-lg py-2 px-4 inline-block">
              {currentTicket.service_name}
            </div>
            <div className="text-lg opacity-90 mt-2">
              Please proceed to <span className="font-bold text-yellow-300">{currentTicket.window_label || 'the service desk'}</span>
            </div>
          </div>
        )}

        {/* Video Advertisement Player - Flexible height */}
        <div className="bg-gray-900 rounded-xl mb-4 overflow-hidden shadow-xl relative flex-grow min-h-0">
          {/* For now, show the attractive fallback content */}
          {/* In production, replace this with actual video when video files are available */}
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden"
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-ping"></div>
              <div className="absolute top-20 right-20 w-16 h-16 bg-yellow-300 rounded-full animate-pulse"></div>
              <div className="absolute bottom-20 left-20 w-12 h-12 bg-green-300 rounded-full animate-bounce"></div>
              <div className="absolute bottom-10 right-10 w-24 h-24 bg-red-300 rounded-full animate-pulse"></div>
            </div>

            <div className="text-center z-10">
              <div className="text-6xl mb-6 animate-bounce">🎬</div>
              <div className="text-4xl font-bold mb-4 drop-shadow-lg">Advertisement Space</div>
              <div className="text-xl opacity-90 mb-4">Place your video ads here</div>
              <div className="text-lg bg-white/20 rounded-lg py-3 px-6 inline-block backdrop-blur-sm">
                CASNOS Queue Management System
              </div>
            </div>
          </div>

          {/* Hidden video element ready for when video files are added */}
          <video
            className="hidden w-full h-80 object-cover"
            autoPlay
            muted
            loop
            playsInline
            style={{ display: 'none' }}
          >
            {/* Video sources can be added here when available */}
            <source src="./resources/assets/sample-ad.mp4" type="video/mp4" />
            <source src="./resources/assets/sample-ad.webm" type="video/webm" />
          </video>
        </div>

        {/* Essential Statistics - Only during non-audio periods */}
        {!showTicketOverlay && (
          <div className="bg-white p-4 rounded-lg grid grid-cols-2 gap-4 text-center shadow-lg flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-orange-500 mb-1">{pendingTickets.length}</div>
              <div className="text-base text-gray-600 font-medium">⏳ Waiting</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{calledTickets.length}</div>
              <div className="text-base text-gray-600 font-medium">📢 Being Served</div>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  export default DisplayScreen;
