import React, { useEffect, useRef } from 'react';
import { useServerConnection, useWindowRegistration, useWindowServiceSetup, useWindowTicketManagement } from '../../hooks';
import { ConnectionGuard } from '../../components/ConnectionGuard';
import { DataLoadingGuard } from '../../components/DataLoadingGuard';
import Logo from '../../components/Logo';

const WindowScreen: React.FC = () => {

  const {
    isReady,
    isConnected,
    isConnecting,
    isRegistered,
    isRegistering,
    connectionError,
    discoveryError,
    registrationError,
    deviceInfo,
    initialize,
    reconnect,
    onEvent
  } = useServerConnection();

  // Window Registration Hook
  const {
    windowData,
    isRegistering: isWindowRegistering,
    isRegistered: isWindowRegistered,
    registrationError: windowRegistrationError,
    registerWindow,
    clearError: clearWindowError
  } = useWindowRegistration();

  // Window Service Setup Hook
  const {
    services,
    selectedService,
    isServiceSet,
    isLoadingServices,
    isSettingService,
    servicesError,
    setupError,
    loadServices,
    setWindowService,
    checkWindowService,
    clearErrors: clearServiceErrors
  } = useWindowServiceSetup();

  // ✅ NEW: Window Ticket Management Hook
  const {
    currentTicket,
    currentTicketNumber,
    isCallingNext,
    hasNoTickets,
    error: ticketError,
    callNextTicket,
    clearError: clearTicketError,
    clearNoTicketsState
  } = useWindowTicketManagement();

  // منع التهيئة المكررة
  const initializationRef = useRef(false);
  const windowRegistrationRef = useRef(false);
  const serviceSetupRef = useRef(false);

  // Initialize connection on component mount
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        if (initializationRef.current) {
          return;
        }

        if (isReady) {
          return;
        }

        initializationRef.current = true;

        // 🔄 PERSISTENT STORAGE: Try to recover previous state first
        try {
          if (deviceInfo?.device_id) {
            const recoveredData = await window.api.persistentRecoverDeviceData(deviceInfo.device_id);
            if (recoveredData?.success && recoveredData.data?.window) {
              const windowData = recoveredData.data.window;

              // Restore window data will be handled after connection establishment
              // Store recovered data for later use
              (window as any).__recoveredWindowData = windowData;
            }
          }
        } catch (persistentError) {
          // Silent error handling for persistent storage
        }

        await initialize('window');
      } catch (error) {
        // Silent error handling
      } finally {
        initializationRef.current = false;
      }
    };

    initializeConnection();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeTicketCreated = onEvent('ticket:created', () => {
      // Ticket created - no specific action needed
    });

    const unsubscribeTicketCalled = onEvent('ticket:called', () => {
      // Ticket called - no specific action needed
    });

    const unsubscribeQueueUpdated = onEvent('queue:updated', () => {
      // Queue updated - no specific action needed
    });

    // System reset listener - refresh window data when system is reset
    const unsubscribeSystemReset = onEvent('system:reset', async () => {
      try {

        // Clear ticket management state
        clearNoTicketsState?.();
        clearTicketError?.();

      } catch (error) {
        // Silent error handling
      }
    });

    return () => {
      unsubscribeTicketCreated();
      unsubscribeTicketCalled();
      unsubscribeQueueUpdated();
      unsubscribeSystemReset();
    };
  }, [isConnected, onEvent]);

  // 🔄 PERSISTENT STORAGE: Auto-save window data when it changes
  useEffect(() => {
    if (deviceInfo?.device_id && windowData) {
      const saveWindowData = async () => {
        try {
          await window.api.persistentSaveWindowData(deviceInfo.device_id, windowData, selectedService);
        } catch (error) {
          // Silent error handling
        }
      };

      const timeoutId = setTimeout(saveWindowData, 1000); // Debounce for 1 second
      return () => clearTimeout(timeoutId);
    }
    return () => {}; // Return cleanup function for all paths
  }, [windowData, selectedService, deviceInfo?.device_id]);

  // Window Registration
  useEffect(() => {
    const shouldRegisterWindow = isRegistered &&
                                deviceInfo?.device_id &&
                                !isWindowRegistering &&
                                !isWindowRegistered &&
                                !windowRegistrationRef.current;

    if (shouldRegisterWindow) {
      const registerWindowForDevice = async () => {
        try {
          windowRegistrationRef.current = true;
          await registerWindow(deviceInfo.device_id);
        } catch (error) {
          clearWindowError();
        } finally {
          windowRegistrationRef.current = false;
        }
      };

      registerWindowForDevice();
    }
  }, [isRegistered, deviceInfo, isWindowRegistering, isWindowRegistered, registerWindow, clearWindowError]);

  // Service Setup
  useEffect(() => {
    const shouldSetupService = isWindowRegistered &&
                              windowData?.id &&
                              !serviceSetupRef.current;

    if (shouldSetupService) {
      const setupWindowService = async () => {
        try {
          serviceSetupRef.current = true;

          const existingService = await checkWindowService(windowData.id);

          if (!existingService) {
            await loadServices();
          }
        } catch (error) {
          serviceSetupRef.current = false;
        }
      };

      setupWindowService();
    }
  }, [isWindowRegistered, windowData?.id]);

  const handleServiceSelection = async (serviceId: number) => {
    if (!windowData?.id) {
      return;
    }

    try {
      await setWindowService(windowData.id, serviceId);
      serviceSetupRef.current = false;
    } catch (error) {
      serviceSetupRef.current = false;
    }
  };

  const handleCallNextTicket = async () => {


    // Check pending tickets first
    try {
    } catch (error) {
      console.error('[WINDOW-SCREEN] Error getting pending tickets:', error);
    }

    if (!windowData?.id) {
      console.error('[WINDOW-SCREEN] No window data or window ID');
      return;
    }

    if (!selectedService?.id) {
      console.error('[WINDOW-SCREEN] No selected service or service ID');
      return;
    }

    if (isCallingNext) {
      console.warn('[WINDOW-SCREEN] Already calling next ticket, ignoring');
      return;
    }

    try {
      clearNoTicketsState();



      const result = await callNextTicket(windowData.id, selectedService.id);

      if (result) {
      } else {
      }
    } catch (error) {
      console.error('[WINDOW-SCREEN] Error calling next ticket:', error);
    }
  };

  // Error display component - Clean modern design
  const ErrorDisplay = ({ error, type, onRetry }: { error: string; type: string; onRetry?: () => void }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-800">{type}</p>
            <p className="text-xs text-red-600 truncate">{error}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200 transition-colors flex-shrink-0 font-medium"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ConnectionGuard
      screenType="window"
      isReady={isReady}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isDiscovering={false}
      isRegistering={isRegistering}
      connectionError={connectionError}
      discoveryError={discoveryError}
      registrationError={registrationError}
      serverInfo={null}
      deviceInfo={deviceInfo}
      onRetry={reconnect}
      onInitialize={() => initialize('window')}
    >
      <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50 overflow-hidden">

        {/* Main Content */}
        <div className="flex-1 p-3 min-h-0 flex flex-col gap-3">
          {/* Error Messages - Clean design */}
          {(discoveryError || connectionError || registrationError || windowRegistrationError || ticketError) && (
            <div className="flex-shrink-0">
              {(discoveryError || connectionError) && (
                <ErrorDisplay
                  error={discoveryError || connectionError || ''}
                  type="خطأ في الاتصال"
                />
              )}

              {registrationError && (
                <ErrorDisplay
                  error={registrationError}
                  type="خطأ في تسجيل الجهاز"
                />
              )}

              {windowRegistrationError && (
                <ErrorDisplay
                  error={windowRegistrationError}
                  type="خطأ في تسجيل الشباك"
                />
              )}

              {ticketError && (
                <ErrorDisplay
                  error={ticketError}
                  type="خطأ في إدارة التذاكر"
                  onRetry={clearTicketError}
                />
              )}
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col">
            {isWindowRegistered && windowData ? (
              <div className="flex-1 flex flex-col gap-3">
                {!isServiceSet ? (
                  // Service Selection Screen - Clean modern design
                  <div className="flex-1 bg-white rounded-lg shadow-lg p-4 flex flex-col">
                    <div className="text-center mb-4 flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <div className="w-8 h-8 bg-white/30 rounded-lg"></div>
                      </div>
                      <h2 className="text-xl font-bold text-primary-800 mb-2">اختيار الخدمة</h2>
                      <p className="text-primary-600">حدد الخدمة التي سيقدمها هذا الشباك</p>
                    </div>

                    {/* Service Loading or Content */}
                    {!isSettingService ? (
                      <DataLoadingGuard
                        isLoading={isLoadingServices}
                        error={servicesError || setupError}
                        data={services}
                        onRetry={() => {
                          clearServiceErrors();
                          loadServices();
                          serviceSetupRef.current = false;
                        }}
                        loadingMessage="جاري تحميل الخدمات..."
                        emptyMessage="لا توجد خدمات متاحة"
                        errorMessage="خطأ في تحميل الخدمات"
                      >
                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-3">
                          {services.map(service => (
                            <button
                              key={service.id}
                              onClick={() => handleServiceSelection(service.id)}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 text-right shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center ml-4 flex-shrink-0 shadow-md">
                                  <div className="w-6 h-6 bg-white/30 rounded-md"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-primary-800 text-lg truncate">{service.name}</h3>
                                  <p className="text-sm text-primary-600">انقر للاختيار</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </DataLoadingGuard>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-primary-700">جاري حفظ الخدمة...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Main Window Interface - Clean modern design
                <div className="flex-1 flex flex-col space-y-2">
                  {/* Window Info Card */}
                  <div className="bg-white rounded-lg shadow-lg p-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                        <div className="w-6 h-6 bg-white/30 rounded-sm"></div>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-primary-800">شباك رقم {windowData.id}</h2>
                        {selectedService && (
                          <p className="text-sm text-primary-600 font-medium truncate">{selectedService.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Current Ticket Display */}
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-lg shadow-lg p-4 text-center flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <div className="w-4 h-4 bg-white/30 rounded-sm"></div>
                      </div>
                      <h3 className="text-sm font-bold">التذكرة الحالية</h3>
                    </div>

                    <div className="text-3xl font-bold mb-2 bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                      {currentTicketNumber || '---'}
                    </div>

                    {currentTicket ? (
                      <>
                        <p className="text-primary-100 mb-1 font-medium text-xs">رقم التذكرة المستدعاة</p>
                 
                      </>
                    ) : hasNoTickets ? (
                      <>
                        <p className="text-primary-100 mb-1 font-medium text-xs">لا توجد تذاكر في الانتظار</p>
                        <p className="text-xs text-primary-200 bg-white/10 rounded-md px-2 py-1 inline-block">
                          {selectedService ? `لا يوجد عملاء للخدمة: ${selectedService.name}` : 'يرجى اختيار خدمة'}
                        </p>
                      </>
                    ) : (
                      <p className="text-primary-100 font-medium text-xs">في انتظار استدعاء التذكرة</p>
                    )}
                  </div>

                  {/* Call Next Ticket Button */}
                  <div className="bg-white rounded-lg shadow-lg p-3 flex-shrink-0">
                    {/* Show no tickets message if applicable */}
                    {hasNoTickets && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-yellow-800 font-medium">لا توجد تذاكر في الانتظار</p>
                            <p className="text-xs text-yellow-600 truncate">
                              {selectedService ? `لا يوجد عملاء للخدمة: ${selectedService.name}` : 'لا توجد تذاكر معلقة حالياً'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCallNextTicket}
                      disabled={isCallingNext || !selectedService}
                      className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 shadow-lg ${
                        isCallingNext
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : selectedService
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {isCallingNext ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>جاري الاستدعاء...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 bg-white/30 rounded-sm"></div>
                            <span>استدعاء التذكرة التالية</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Enhanced Loading/Setup Screen - Clean modern design
            <div className="flex-1 bg-white rounded-lg shadow-lg p-3 flex flex-col">
              <div className="text-center mb-4 flex-shrink-0">
                {/* Loading Icon with Logo */}
                <div className="relative mx-auto mb-3">
                  {/* Outer rotating ring */}
                  <div className="absolute inset-0 w-12 h-12 border-2 border-primary-200 rounded-full animate-spin"></div>

                  {/* Inner main icon with Logo */}
                  <div className="relative w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Logo className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>

                {/* Title Card */}
                <div className="bg-primary-50 rounded-lg p-3 shadow-sm">
                  <h2 className="text-lg font-bold text-primary-800 mb-1">
                    تهيئة الشباك
                  </h2>
                  <p className="text-sm text-primary-600 mb-2">جاري إعداد وتجهيز الشباك للاستخدام</p>
                  <p className="text-xs text-primary-500">
                    يرجى الانتظار قليلاً...
                  </p>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                  <h3 className="text-sm font-bold text-primary-800 mb-2 text-center">
                    مراحل التهيئة
                  </h3>

                  <div className="space-y-2">
                    {/* Server Connection Step */}
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                      isConnected
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isConnected
                            ? 'bg-green-100'
                            : isConnecting
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                        }`}>
                          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isConnected
                              ? 'bg-green-500'
                              : isConnecting
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary-800">الاتصال بالخادم</span>
                          <p className={`text-xs transition-colors duration-300 ${
                            isConnected
                              ? 'text-green-600'
                              : isConnecting
                                ? 'text-blue-600'
                                : 'text-gray-500'
                          }`}>
                            {isConnected ? 'تم الاتصال بنجاح' : isConnecting ? 'جاري الاتصال...' : 'في الانتظار'}
                          </p>
                        </div>
                      </div>
                      {isConnecting && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {/* Device Registration Step */}
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                      isRegistered
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isRegistered
                            ? 'bg-green-100'
                            : isRegistering
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                        }`}>
                          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isRegistered
                              ? 'bg-green-500'
                              : isRegistering
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary-800">تسجيل الجهاز</span>
                          <p className={`text-xs transition-colors duration-300 ${
                            isRegistered
                              ? 'text-green-600'
                              : isRegistering
                                ? 'text-blue-600'
                                : 'text-gray-500'
                          }`}>
                            {isRegistered ? 'تم التسجيل بنجاح' : isRegistering ? 'جاري التسجيل...' : 'في الانتظار'}
                          </p>
                        </div>
                      </div>
                      {isRegistering && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {/* Window Registration Step */}
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                      isWindowRegistered
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isWindowRegistered
                            ? 'bg-green-100'
                            : isWindowRegistering
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                        }`}>
                          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isWindowRegistered
                              ? 'bg-green-500'
                              : isWindowRegistering
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary-800">تسجيل الشباك</span>
                          <p className={`text-xs transition-colors duration-300 ${
                            isWindowRegistered
                              ? 'text-green-600'
                              : isWindowRegistering
                                ? 'text-blue-600'
                                : 'text-gray-500'
                          }`}>
                            {isWindowRegistered ? 'تم التسجيل بنجاح' : isWindowRegistering ? 'جاري التسجيل...' : 'في الانتظار'}
                          </p>
                        </div>
                      </div>
                      {isWindowRegistering && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </ConnectionGuard>
  );
};

export default WindowScreen;
