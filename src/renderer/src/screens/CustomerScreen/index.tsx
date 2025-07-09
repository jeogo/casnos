import React, { useState } from 'react'
import { useCustomerInitialization } from '../../hooks/useCustomerInitialization'
import { useCustomerServices } from '../../hooks/useCustomerServices'
import { useCustomerTicketCreation } from '../../hooks/useCustomerTicketCreation'
import { ConnectionGuard } from '../../components/ConnectionGuard'
import { DataLoadingGuard } from '../../components/DataLoadingGuard'
import { useCustomerPrinterSetup } from '../../hooks/useCustomerPrinterSetup'
import Logo from '../../components/Logo'

const CustomerScreen: React.FC = () => {
  // State for UI management
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPrinterDialog, setShowPrinterDialog] = useState(false)
  const [showControlDialog, setShowControlDialog] = useState(false)
  const [printerFilter, setPrinterFilter] = useState<'all' | 'local' | 'network'>('local')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Core initialization
  const initialization = useCustomerInitialization()

  // Customer Services Hook
  const {
    services,
    isLoading: isLoadingServices,
    error: servicesError,
    loadServices
  } = useCustomerServices(initialization.isInitialized)

  // Ticket Creation Hook
  const {
    error: ticketError,
    createTicket
  } = useCustomerTicketCreation()

  // Printer Setup Hook
  const {
    printers,
    selectedPrinter,
    isLoadingDatabase,
    error: printerError,
    loadAllDatabasePrinters,
    detectPrinters,
    setPrinter
  } = useCustomerPrinterSetup(initialization.isInitialized)

  // Filter printers based on selected filter
  const filteredPrinters = React.useMemo(() => {
    if (printerFilter === 'all') return printers
    if (printerFilter === 'local') return printers.filter(p => p.source === 'local')
    if (printerFilter === 'network') return printers.filter(p => p.source === 'database')
    return printers
  }, [printers, printerFilter])

  // Load database printers after initialization
  React.useEffect(() => {
    if (initialization.isInitialized && !isLoadingDatabase) {
      loadAllDatabasePrinters()
    }
  }, [initialization.isInitialized])

  // Refresh printers when dialog opens
  const refreshPrintersForDialog = React.useCallback(async () => {
    if (!initialization.isInitialized) return
    try {
      await detectPrinters()
      await loadAllDatabasePrinters()
    } catch (error) {
      // Silent error handling
    }
  }, [initialization.isInitialized, detectPrinters, loadAllDatabasePrinters])

  // Control functions
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleExit = async () => {
    try {
      if (window.api && window.api.closeWindow) {
        await window.api.closeWindow('customer')
      } else {
        window.close()
      }
    } catch (error) {
      // Fallback to direct window close
      window.close()
    }
  }

  // Listen for fullscreen changes and keyboard shortcuts
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault()
        handleFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close dialog when clicking outside
  const handleDialogBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setShowControlDialog(false)
    }
  }

  // Handle service selection and create ticket
  const handleServiceSelection = async (serviceId: number, serviceName: string) => {
    if (isProcessing || !selectedPrinter || !initialization.isInitialized) {
      return
    }

    try {
      setIsProcessing(true)
      setSelectedService(serviceId)

      const isLocalPrinter = selectedPrinter.source === 'local'
      const isDatabasePrinter = selectedPrinter.source === 'database' || selectedPrinter.database_id
      const printType: 'local' | 'network' = isLocalPrinter ? 'local' : 'network'

      // Create ticket
      const ticket = await createTicket(serviceId, serviceName, printType)

      // Update print status for database printers
      if (isDatabasePrinter) {
        try {
          await window.api.updatePrintStatus(ticket.id, 'printing')
        } catch (statusError) {
          // Silent error handling
        }
      }

      // Print ticket
      try {
        let printResult

        if (isLocalPrinter) {
          const printTicketData = {
            ...ticket,
            service_name: serviceName,
            company_name: "",
            print_source: 'customer' as const
          }

          printResult = await window.api.printTicket(printTicketData, selectedPrinter.name)

          if (printResult && printResult.success) {
            try {
              await window.api.updatePrintStatus(ticket.id, 'printed')
            } catch (statusError) {
              // Silent error handling
            }
          } else {
            try {
              await window.api.updatePrintStatus(ticket.id, 'print_failed')
            } catch (statusError) {
              // Silent error handling
            }
          }
        } else if (isDatabasePrinter) {
          printResult = {
            success: true,
            message: 'تم تحديد الطباعة على شاشة العرض - ستتم الطباعة تلقائياً',
            printer: selectedPrinter.name,
            method: 'database-display'
          }
        } else {
          const printTicketData = {
            ...ticket,
            service_name: serviceName,
            company_name: "",
            print_source: 'customer' as const
          }

          printResult = await window.api.printTicket(printTicketData, selectedPrinter.name)
        }
      } catch (printError) {
        // Silent error handling
      }

    } catch (error) {
      // Silent error handling
    } finally {
      setIsProcessing(false)
      setSelectedService(null)
    }
  }

  // Calculate loading and error states
  const isLoading = initialization.isInitializing || isLoadingServices
  const hasErrors = initialization.initializationError || servicesError || ticketError || printerError

  return (
    <ConnectionGuard
      screenType="customer"
      isReady={initialization.isInitialized}
      isConnected={initialization.serverConnection.isConnected}
      isConnecting={initialization.serverConnection.isConnecting}
      isDiscovering={initialization.serverConnection.isDiscovering}
      isRegistering={initialization.serverConnection.isRegistering}
      connectionError={initialization.serverConnection.connectionError}
      discoveryError={initialization.serverConnection.discoveryError}
      registrationError={initialization.serverConnection.registrationError}
      serverInfo={initialization.serverConnection.serverInfo}
      deviceInfo={initialization.serverConnection.deviceInfo}
      onRetry={initialization.retry}
      onInitialize={initialization.initialize}
    >
      {/* Modern Full-Screen Customer Interface */}
      <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50 overflow-hidden">
        {/* Top Header with Logo, Title, and Printer Icon */}
        <div className="relative w-full p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center">
            {/* Left side: Logo and Title */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
              {/* Logo - Top Left (Secret Control Button) */}
              <button
                onClick={() => setShowControlDialog(true)}
                className="flex-shrink-0 transition-all duration-300 hover:scale-105"
              >
                <Logo size="xl" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24" />
              </button>

              {/* Title */}
              <div className="text-right">
                <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-primary-800 font-arabic leading-tight">
                  الصندوق الوطني للضمان الاجتماعي لغير الاجراء
                </h1>
                <h2 className="text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-primary-600 font-arabic mt-1">
                  وكالة المسيلة الشباك الجواري برهوم
                </h2>
              </div>
            </div>

            {/* Right side: Empty space (controls moved to logo click) */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20"></div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl mx-auto">
            {/* Services Grid */}
            <div className="w-full">
              <DataLoadingGuard
                isLoading={isLoading}
                error={hasErrors ? 'حدثت أخطاء أثناء التحميل' : null}
                data={services}
                onRetry={loadServices}
                loadingMessage="جاري تحميل الخدمات..."
                emptyMessage="لا توجد خدمات متاحة"
                errorMessage="حدث خطأ في تحميل الخدمات"
              >
                <div className={`gap-4 sm:gap-6 lg:gap-8 ${
                  services.length === 1
                    ? 'flex justify-center'
                    : services.length === 2
                    ? 'grid grid-cols-2'
                    : services.length === 3
                    ? 'grid grid-cols-3'
                    : 'flex flex-col items-center'
                }`}>
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelection(service.id, service.name)}
                      disabled={isProcessing || !selectedPrinter || selectedService === service.id}
                      className={`
                        relative px-8 py-6 sm:px-12 sm:py-8 lg:px-16 lg:py-10 rounded-2xl transition-all duration-300 text-center font-arabic
                        ${selectedService === service.id
                          ? 'bg-yellow-100 border-2 border-yellow-400 scale-95 shadow-lg'
                          : isProcessing || !selectedPrinter
                            ? 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50'
                            : 'bg-white hover:bg-primary-50 border-2 border-primary-200 hover:border-primary-400 hover:scale-105 cursor-pointer shadow-lg hover:shadow-xl'
                        }
                        ${services.length === 1 ? 'w-full max-w-2xl' : services.length >= 4 ? 'w-full max-w-3xl' : ''}
                        min-h-[100px] sm:min-h-[120px] lg:min-h-[140px]
                        flex items-center justify-center
                      `}
                    >
                      {selectedService === service.id && (
                        <div className="absolute top-4 left-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                        </div>
                      )}

                      <div className="flex flex-col items-center justify-center">
                        <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary-800 leading-tight">
                          {service.name}
                        </h3>
                        {selectedService === service.id && (
                          <p className="text-sm sm:text-base lg:text-lg text-yellow-600 mt-3 font-medium">
                            جاري إنشاء التذكرة...
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </DataLoadingGuard>
            </div>
          </div>
        </div>

        {/* Control Dialog */}
        {showControlDialog && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleDialogBackdropClick}
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg mx-auto shadow-2xl">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-800 font-arabic">لوحة التحكم</h3>
                  <p className="text-sm sm:text-base lg:text-lg text-primary-600 mt-1 font-arabic">أدوات النظام والتحكم</p>
                </div>
                <button
                  onClick={() => setShowControlDialog(false)}
                  className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Control Buttons */}
              <div className="space-y-4">
                {/* Printer Button */}
                <button
                  onClick={() => {
                    setShowControlDialog(false)
                    setShowPrinterDialog(true)
                  }}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-primary-800 font-arabic">إعدادات الطابعة</div>
                      <div className="text-sm sm:text-base text-primary-600 mt-1 font-arabic">
                        {selectedPrinter ? `الطابعة: ${selectedPrinter.name}` : 'لم يتم اختيار طابعة'}
                      </div>
                    </div>
                    <div className="text-4xl ml-4">🖨️</div>
                  </div>
                </button>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-blue-800 font-arabic">تحديث الصفحة</div>
                      <div className="text-sm sm:text-base text-blue-600 mt-1 font-arabic">إعادة تحميل النظام</div>
                    </div>
                    <div className="text-4xl ml-4">🔄</div>
                  </div>
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={handleFullscreen}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-green-800 font-arabic">
                        {isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
                      </div>
                      <div className="text-sm sm:text-base text-green-600 mt-1 font-arabic">
                        {isFullscreen ? 'العودة للحجم العادي' : 'عرض بملء الشاشة (F11)'}
                      </div>
                    </div>
                    <div className="text-4xl ml-4">{isFullscreen ? '🪟' : '⛶'}</div>
                  </div>
                </button>

                {/* Exit Button */}
                <button
                  onClick={handleExit}
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg sm:text-xl text-red-800 font-arabic">إغلاق النافذة</div>
                      <div className="text-sm sm:text-base text-red-600 mt-1 font-arabic">الخروج من النظام</div>
                    </div>
                    <div className="text-4xl ml-4">🚪</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printer Selection Dialog */}
        {showPrinterDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg lg:max-w-2xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-800 font-arabic">اختيار الطابعة</h3>
                  <p className="text-sm sm:text-base lg:text-lg text-primary-600 mt-1 font-arabic">اختر من الطابعات المتاحة</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshPrintersForDialog}
                    disabled={isLoadingDatabase}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      isLoadingDatabase
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110'
                    }`}
                    title="تحديث قائمة الطابعات"
                  >
                    <svg
                      className={`w-6 h-6 ${isLoadingDatabase ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowPrinterDialog(false)}
                    className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setPrinterFilter('local')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium font-arabic transition-all duration-200 ${
                    printerFilter === 'local'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  محلية
                </button>
                <button
                  onClick={() => setPrinterFilter('network')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium font-arabic transition-all duration-200 ${
                    printerFilter === 'network'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  شبكة
                </button>
              </div>

              {/* Printers List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <DataLoadingGuard
                    isLoading={isLoadingDatabase}
                    error={null}
                    data={filteredPrinters}
                    loadingMessage="جاري تحديث الطابعات..."
                    emptyMessage="لا توجد طابعات متاحة"
                  >
                    {filteredPrinters.map((printer) => {
                      const printerSource = printer.source || 'local'
                      const printerIcon = printerSource === 'database' ? '🌐' : '💻'
                      const printerTypeLabel = printerSource === 'database' ? 'شبكة' : 'محلية'
                      const badgeColor = printerSource === 'database' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'

                      return (
                        <button
                          key={printer.id}
                          onClick={() => {
                            setPrinter(printer.id)
                            localStorage.setItem('defaultPrinter', JSON.stringify({
                              id: printer.id,
                              name: printer.name,
                              source: printerSource,
                              savedAt: new Date().toISOString()
                            }))
                            setShowPrinterDialog(false)
                          }}
                          className={`w-full p-4 sm:p-6 rounded-2xl border-2 text-right transition-all duration-200 ${
                            selectedPrinter?.id === printer.id
                              ? 'border-primary-500 bg-primary-50 shadow-lg'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-lg sm:text-xl text-primary-800 font-arabic">{printer.name}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-lg">{printerIcon}</span>
                                <span className={`text-sm px-3 py-1 rounded-full font-medium ${badgeColor}`}>
                                  {printerTypeLabel}
                                </span>
                                {printer.isDefault && (
                                  <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                    افتراضي
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-4xl ml-4">
                              {selectedPrinter?.id === printer.id ? '✅' : '🖨️'}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </DataLoadingGuard>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConnectionGuard>
  )
}

export default CustomerScreen
