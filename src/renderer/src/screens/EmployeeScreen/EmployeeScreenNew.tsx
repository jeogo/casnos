import React, { useEffect, useState, useRef } from 'react';
import appServices from '../../utils/appServices';
import APP_CONFIG from '../../config/appConfig';
import { getDeviceInfo, DEVICE_NAMES, getPersistentDeviceId } from '../../utils/deviceInfo';
import { autoRegisterDevice } from '../../utils/deviceRegistration';
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

interface Service {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  window_number: string;
  service_id: number | null;
  service_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EmployeeScreen: React.FC = () => {
  // Remove all connection UI states - silent background reconnection only
  const [isInitializing, setIsInitializing] = useState(true);

  // Employee and service management
  const [services, setServices] = useState<Service[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null); // Used for session management
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [windowNumber, setWindowNumber] = useState<string>('');
  const [isServiceSelected, setIsServiceSelected] = useState(false);

  // Ticket management
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [nextTicket, setNextTicket] = useState<Ticket | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const socketRef = useRef<any>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Suppress unused variable warning for employee state (used for session tracking)
  void employee;

  // =================================================================
  // 1. SERVICES FETCHING
  // =================================================================

  // Fetch available services
  const fetchServices = async (): Promise<Service[]> => {
    try {
      const response = await appServices.getServices();
      const servicesList = Array.isArray(response) ? response : ((response as any).data || []);
      setServices(servicesList);
      return servicesList;
    } catch (err) {
      setServices([]);
      return [];
    }
  };

  // =================================================================
  // 2. SERVICE SELECTION AND ASSIGNMENT
  // =================================================================

  // Handle service selection by employee
  const handleServiceSelection = async (serviceId: number) => {
    try {
      setIsProcessing(true);
      setNextTicket(null); // Clear current ticket when changing service

      if (!windowNumber) {
        throw new Error('رقم الشباك غير متوفر');
      }

      // Assign service to employee in database using API
      const assignResult = await appServices.assignServiceToEmployee(windowNumber, serviceId);

      if (assignResult.success) {
        const updatedEmployee = assignResult.data;
        setEmployee(updatedEmployee);
        setSelectedServiceId(serviceId);
        setIsServiceSelected(true);
        setIsInitializing(false);

        const serviceName = services.find(s => s.id === serviceId)?.name || 'غير معروف';
        console.log(`[EMPLOYEE] ✅ تم تعيين الخدمة "${serviceName}" للشباك ${windowNumber}`);

        // Connect socket and start working
        await connectSocket();
      } else {
        console.error('[EMPLOYEE] فشل في تعيين الخدمة:', assignResult.message);
      }

    } catch (err) {
      console.error('[EMPLOYEE] ❌ خطأ في اختيار الخدمة:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // =================================================================
  // 5. SOCKET CONNECTION FOR REAL-TIME COMMUNICATION
  // =================================================================

  // Initialize employee session
  const initializeEmployee = async () => {
    try {
      setIsInitializing(true);

      // Get persistent device ID
      const deviceId = await getPersistentDeviceId('employee');
      deviceIdRef.current = deviceId;

      // Initialize employee session with server
      const sessionResult = await appServices.initializeEmployeeSession(deviceId, DEVICE_NAMES.employee);

      if (sessionResult.success) {
        const employeeData = sessionResult.data.employee;
        setEmployee(employeeData);
        setWindowNumber(employeeData.window_number);

        // Check if employee already has a service assigned
        if (employeeData.service_id) {
          setSelectedServiceId(employeeData.service_id);
          setIsServiceSelected(true);
          setIsInitializing(false);

          // Connect socket and start working
          await connectSocket();
          return;
        }
      }

      // No service assigned, show service selection
      console.log('[EMPLOYEE] No service assigned, showing service selection');
      setIsInitializing(false);

    } catch (err) {
      console.error('[EMPLOYEE] ❌ Error initializing employee:', err);
      setIsInitializing(false);
    }
  };

  // =================================================================
  // 3. TICKET REFRESH MECHANISM
  // =================================================================

  // Set up automatic refresh interval
  useEffect(() => {
    if (!selectedServiceId) return;

    const refreshInterval = setInterval(fetchNextTicket, 5000); // Check every 5 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [selectedServiceId]);

  // Fetch tickets whenever service changes
  useEffect(() => {
    if (selectedServiceId) {
      fetchNextTicket();
    }
  }, [selectedServiceId]);

  // Socket event handler for ticket updates
  useEffect(() => {
    if (!socketRef.current || !selectedServiceId) return;

    const handleTicketUpdate = () => {
      console.log('[EMPLOYEE] Received ticket update event, refreshing tickets');
      fetchNextTicket();
    };

    // Listen for ticket updates
    socketRef.current.on('new-ticket', handleTicketUpdate);
    socketRef.current.on('ticket-called', handleTicketUpdate);

    return () => {
      socketRef.current.off('new-ticket', handleTicketUpdate);
      socketRef.current.off('ticket-called', handleTicketUpdate);
    };
  }, [socketRef.current, selectedServiceId]);

  // Fetch next pending ticket for selected service only
  const fetchNextTicket = async () => {
    if (!selectedServiceId) {
      setNextTicket(null);
      return;
    }

    try {
      console.log('[EMPLOYEE] Fetching next pending ticket for service:', selectedServiceId);
      const response = await appServices.getTickets();
      const ticketsList = Array.isArray(response) ? response : ((response as any).data || []);

      // Filter tickets for this service only
      const serviceTickets = ticketsList.filter((ticket: Ticket) =>
        ticket.service_id === selectedServiceId && ticket.status === 'pending'
      );

      if (serviceTickets.length > 0) {
        // Sort by creation time (oldest first)
        const sortedTickets = serviceTickets.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Only update if the next ticket has changed
        const nextTicket = sortedTickets[0];
        if (!currentTicket || nextTicket.id !== currentTicket.id) {
          setNextTicket(nextTicket);
        }
      } else {
        setNextTicket(null);
      }

    } catch (err) {
      console.error('[EMPLOYEE] ❌ Error fetching next ticket:', err);
      // Don't clear existing ticket on fetch error, just log it
    }
  };

  // Handle next ticket (serve current and call next)
  const handleNext = async () => {
    if (isProcessing || !selectedServiceId || !windowNumber) return;

    setIsProcessing(true);
    try {
      // 1. If there's a current ticket, serve it
      if (currentTicket) {
        await appServices.serveTicket(currentTicket.id, windowNumber);
        setCurrentTicket(null);
      }

      // 2. Get all pending tickets for this service and call the oldest one
      const response = await appServices.getTickets();
      const ticketsList = Array.isArray(response) ? response : ((response as any).data || []);
      const serviceTickets = ticketsList.filter((ticket: Ticket) =>
        ticket.service_id === selectedServiceId && ticket.status === 'pending'
      );

      // Sort by creation time (oldest first)
      const nextServiceTicket = serviceTickets.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];

      // 3. If found a new ticket, call it and update its status
      if (nextServiceTicket) {
        const callResponse = await appServices.callTicket(nextServiceTicket.id, windowNumber);
        const calledTicket = callResponse.success ? callResponse.data : callResponse;
        setCurrentTicket(calledTicket);
      } else {
        setCurrentTicket(null);
      }

      // Update next ticket preview
      setNextTicket(null);
      await fetchNextTicket();

    } catch (err) {
      console.error('[EMPLOYEE] ❌ Error handling next ticket:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Socket connection
  const connectSocket = async () => {
    try {
      if (!appServices.isServerDiscovered()) {
        console.log('[EMPLOYEE] Server not discovered yet, waiting...');
        attemptReconnect();
        return null;
      }

      if (!selectedServiceId || !windowNumber) {
        console.log('[EMPLOYEE] Service or window not selected yet, waiting...');
        attemptReconnect();
        return null;
      }

      console.log('[EMPLOYEE] Connecting to socket server...');

      // Get device info
      const deviceId = deviceIdRef.current || await getPersistentDeviceId('employee');
      const deviceName = `${DEVICE_NAMES.employee} - شباك ${windowNumber}`;
      const deviceInfo = await getDeviceInfo('employee', deviceName, deviceId);

      const socket = appServices.connectSocket(deviceInfo);
      socketRef.current = socket;

      socket.on('connect', async () => {
        console.log('[EMPLOYEE] ✅ Socket connected successfully');

        // Register device
        try {
          const registrationResult = await autoRegisterDevice(deviceInfo);
          console.log('[EMPLOYEE] ✅ Device registration completed:', registrationResult);
        } catch (err) {
          console.warn('[EMPLOYEE] ⚠️ Device registration failed:', err);
        }

        // Fetch initial next ticket
        await fetchNextTicket();

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      });

      // Listen for real-time ticket updates
      socket.on('new-ticket', (ticket: Ticket) => {
        console.log('[EMPLOYEE] New ticket received:', ticket);
        if (ticket.service_id === selectedServiceId) {
          setTimeout(fetchNextTicket, 500);
        }
      });

      socket.on('ticket-called', (data: any) => {
        console.log('[EMPLOYEE] Ticket called:', data);
        setTimeout(fetchNextTicket, 500);
      });

      socket.on('disconnect', () => {
        console.log('[EMPLOYEE] Socket disconnected, will reconnect...');
        attemptReconnect();
      });

      socket.on('connect_error', (error) => {
        console.log('[EMPLOYEE] Socket connection error, will reconnect...', error);
        attemptReconnect();
      });

      return socket;

    } catch (err) {
      console.error('[EMPLOYEE] ❌ Socket connection failed:', err);
      attemptReconnect();
      return null;
    }
  };

  const attemptReconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    reconnectTimeout.current = setTimeout(() => {
      connectSocket();
    }, RECONNECT_INTERVAL);
  };

  // Initialize on component mount
  useEffect(() => {
    const initializeComponent = async () => {
      console.log('[EMPLOYEE] Initializing employee screen...');

      // Ensure server discovery first
      const discoverySuccess = await appServices.initializeWithDiscovery();
      if (!discoverySuccess) {
        console.log('[EMPLOYEE] Server not found yet, will keep trying...');
        setIsInitializing(false);
        return;
      }

      // Load available services
      await fetchServices();

      // Initialize employee session
      await initializeEmployee();
    };

    initializeComponent();

    // Cleanup
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-refresh next ticket every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isServiceSelected && selectedServiceId) {
        fetchNextTicket();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isServiceSelected, selectedServiceId]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-blue-100 p-4 overflow-hidden relative">
      {/* Logo in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <Logo size="lg" position="left" />
      </div>

      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0 bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-blue-600 text-3xl font-bold drop-shadow-md">
              🏢 CASNOS Employee Screen
            </h1>
          </div>
          {windowNumber && (
            <h2 className="text-gray-600 text-xl font-normal">
              شباك {windowNumber}
            </h2>
        )}
      </div>

      {/* Service Selection - Show when no service is selected */}
      {!isServiceSelected && (
        <div className="bg-white p-10 rounded-2xl mb-8 shadow-xl text-center">
          <h2 className="text-blue-600 mb-8 text-3xl font-bold">
            🎯 اختر خدمتك
          </h2>
          <p className="text-gray-600 mb-5 text-base leading-relaxed">
            يرجى اختيار الخدمة التي ستقوم بخدمتها في هذا الشباك. ستستقبل فقط تذاكر الخدمة المختارة.
          </p>

          {isInitializing ? (
            <div className="py-8 text-gray-500 text-base text-center">
              <div className="text-5xl my-5">🔄</div>
              <h3 className="text-gray-600 my-3">جاري التهيئة...</h3>
              <p className="text-gray-500 m-0">يرجى الانتظار بينما نقوم بإعداد شاشة الموظف.</p>
            </div>
          ) : services.length === 0 ? (
            <div className="py-8 text-gray-500 text-base text-center">
              <div className="text-5xl my-5">📋</div>
              <h3 className="text-gray-600 my-3">لا توجد خدمات متاحة</h3>
              <p className="text-gray-500 m-0">لا توجد خدمات متاحة حاليًا. تواصل مع الإدارة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelection(service.id)}
                  disabled={isProcessing}
                  className={`bg-gradient-to-br from-blue-600 to-blue-400 text-white border-none p-5 rounded-xl text-lg font-bold min-h-20 flex items-center justify-center text-center transition-all duration-300 shadow-lg ${
                    isProcessing
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:from-blue-700 hover:to-blue-500'
                  }`}
                >
                  {service.name}
                </button>
              ))}
            </div>
          )}

          {isProcessing && (
            <div className="text-blue-600 text-base font-bold mt-5">
              ⏳ جاري إعداد الشباك...
            </div>
          )}
        </div>
      )}

      {/* Main Content - Show when service is selected */}
      {isServiceSelected && (
        <>
          {/* Current Ticket Display */}
          {currentTicket && (
            <div className="bg-gradient-to-br from-green-500 to-green-400 text-white p-10 rounded-2xl text-center mb-8 shadow-xl">
              <h2 className="m-0 mb-4 text-2xl font-bold">🎫 التذكرة الحالية</h2>
              <div className="text-6xl font-bold my-5">
                #{currentTicket.ticket_number}
              </div>
              <div className="text-2xl my-4">
                {currentTicket.service_name}
              </div>
              <div className="text-lg opacity-90">
                تم استدعاؤها في: {currentTicket.called_at ? new Date(currentTicket.called_at).toLocaleTimeString() : 'الآن'}
              </div>
            </div>
          )}

          {/* Next Ticket Preview */}
          {nextTicket && !currentTicket && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-400 text-white p-8 rounded-xl text-center mb-8 shadow-lg">
              <h3 className="m-0 mb-3 text-xl font-semibold">⏳ التذكرة التالية</h3>
              <div className="text-5xl font-bold my-4">
                #{nextTicket.ticket_number}
              </div>
            </div>
          )}

          {/* No Tickets Available */}
          {!currentTicket && !nextTicket && (
            <div className="bg-gradient-to-br from-gray-400 to-gray-300 text-white p-8 rounded-xl text-center mb-8 shadow-lg">
              <h3 className="m-0 mb-3 text-xl font-semibold">📭 لا توجد تذاكر</h3>
              <div className="text-lg">لا توجد تذاكر في انتظار الخدمة حاليًا</div>
            </div>
          )}

          {/* Next Button */}
          <div className="text-center mb-8">
            <button
              onClick={handleNext}
              disabled={isProcessing || (!currentTicket && !nextTicket)}
              className={`px-12 py-5 text-2xl font-bold rounded-2xl border-none shadow-xl transition-all duration-300 ${
                isProcessing || (!currentTicket && !nextTicket)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-br from-blue-600 to-blue-400 text-white cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:from-blue-700 hover:to-blue-500'
              }`}
            >
              {isProcessing ? '⏳ جاري المعالجة...' : 'التالي ▶️'}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h4 className="text-lg font-bold text-blue-700 mb-4">📖 تعليمات الاستخدام:</h4>
            <p className="my-1">
              • اضغط <strong>"التالي"</strong> لإنهاء التذكرة الحالية واستدعاء التذكرة التالية
            </p>
            <p className="my-1">
              • ستتعامل فقط مع تذاكر خدمة: <strong>{services.find(s => s.id === selectedServiceId)?.name}</strong>
            </p>
            <p className="my-1">
              • يتم تحديث النظام تلقائيًا كل 10 ثوانٍ
            </p>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default EmployeeScreen;
