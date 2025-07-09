import React, { useState, useEffect } from 'react'
import { useAdminServices } from '../../hooks/useAdminServices'
import { useAdminWindows } from '../../hooks/useAdminWindows'
import { useAdminPrinters } from '../../hooks/useAdminPrinters'
import { useServerConnection } from '../../hooks/useServerConnection'
import { ConnectionGuard } from '../../components/ConnectionGuard'
import { DataLoadingGuard } from '../../components/DataLoadingGuard'
import {
  Plus,
  Edit,
  Trash2,
  Monitor,
  Settings,
  Users,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Printer,
  RotateCcw,
  Activity,
  Database,
  Zap,
  Shield,
  Maximize,
  Minimize,
  LogOut
} from 'lucide-react'

// Types from the hooks
interface Service {
  id: number
  name: string
  created_at: string
}

interface WindowData {
  id: number
  service_id?: number
  device_id?: string
  active: boolean
  device_connected?: boolean
  created_at: string
  label?: string
}

const AdminScreen: React.FC = () => {
  // Navigation state
  const [activeTab, setActiveTab] = useState<'services' | 'windows' | 'printers' | 'system'>('services')

  // Modal states
  const [showAddService, setShowAddService] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showAssignServices, setShowAssignServices] = useState<WindowData | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)

  // Form states
  const [newServiceName, setNewServiceName] = useState('')

  // UI states
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // System management state
  const [isResetting, setIsResetting] = useState(false)
  const [resetStatus, setResetStatus] = useState<any>(null)

  // Connection hook
  const {
    isDiscovering,
    isConnecting,
    isRegistering,
    isConnected,
    serverInfo,
    deviceInfo,
    discoveryError,
    connectionError,
    registrationError,
    initialize,
    reconnect
  } = useServerConnection()

  // Services hook
  const {
    services,
    isLoading: servicesLoading,
    error: servicesError,
    loadServices,
    createService,
    updateService,
    deleteService
  } = useAdminServices()

  // Windows hook
  const {
    windows,
    isLoading: windowsLoading,
    error: windowsError,
    loadWindows,
    deleteWindow,
    assignService,
    removeService
  } = useAdminWindows()

  // Printers hook
  const {
    printers,
    isLoading: isLoadingPrinters,
    error: printersError,
    loadPrinters,
    deletePrinter
  } = useAdminPrinters()

  // Computed values
  const filteredServices = services
  const filteredWindows = windows
  const filteredPrinters = printers

  // Effects
  useEffect(() => {
    if (isConnected) {
      loadServices()
      loadWindows()
      loadPrinters()
    }
  }, [isConnected])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
    return () => {} // Empty cleanup for when notification is null
  }, [notification])

  // Handlers
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
  }

  const handleRefresh = () => {
    if (activeTab === 'services') {
      loadServices()
    } else if (activeTab === 'windows') {
      loadWindows()
    } else if (activeTab === 'printers') {
      loadPrinters()
    }
    showNotification('success', 'تم تحديث البيانات بنجاح')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleExit = async () => {
    try {
      showNotification('success', 'جاري إغلاق التطبيق...')
      setTimeout(() => {
        window.close()
      }, 1000)
    } catch (error) {
      showNotification('error', 'فشل في إغلاق التطبيق')
    }
  }

  const handleAddService = async () => {
    if (!newServiceName.trim()) return

    try {
      await createService(newServiceName.trim())
      setNewServiceName('')
      setShowAddService(false)
      showNotification('success', 'تم إنشاء الخدمة بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في إنشاء الخدمة')
    }
  }

  const handleEditService = async () => {
    if (!editingService || !newServiceName.trim()) return

    try {
      await updateService(editingService.id, newServiceName.trim())
      setEditingService(null)
      setNewServiceName('')
      showNotification('success', 'تم تحديث الخدمة بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في تحديث الخدمة')
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    try {
      await deleteService(serviceId)
      showNotification('success', 'تم حذف الخدمة بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في حذف الخدمة')
    }
  }

  const handleDeleteWindow = async (windowId: number) => {
    try {
      await deleteWindow(windowId)
      showNotification('success', 'تم حذف الشباك بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في حذف الشباك')
    }
  }

  const handleAssignService = async (windowId: number, serviceId: number) => {
    try {
      await assignService(windowId, serviceId)
      showNotification('success', 'تم تخصيص الخدمة بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في تخصيص الخدمة')
    }
  }

  const handleRemoveService = async (windowId: number) => {
    try {
      await removeService(windowId)
      showNotification('success', 'تم إلغاء تخصيص الخدمة بنجاح')
    } catch (error) {
      showNotification('error', 'فشل في إلغاء تخصيص الخدمة')
    }
  }

  const handleSaveServiceAssignment = async () => {
    if (!showAssignServices) return

    try {
      if (selectedServiceId === null) {
        // Remove service assignment
        await handleRemoveService(showAssignServices.id)
      } else {
        // Assign selected service
        await handleAssignService(showAssignServices.id, selectedServiceId)
      }
      // Close modal and reset selection
      setShowAssignServices(null)
      setSelectedServiceId(null)
    } catch (error) {
      // Error handling is already done in handleAssignService/handleRemoveService
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        setResetStatus(data)
        showNotification('success', 'تم إعادة تعيين النظام بنجاح')
      } else {
        throw new Error('Reset failed')
      }
    } catch (error) {
      showNotification('error', 'فشل في إعادة تعيين النظام')
    } finally {
      setIsResetting(false)
    }
  }

  const handleForceReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })

      if (response.ok) {
        const data = await response.json()
        setResetStatus(data)
        showNotification('success', 'تم إعادة التعيين القسرية للنظام بنجاح')
      } else {
        throw new Error('Force reset failed')
      }
    } catch (error) {
      showNotification('error', 'فشل في الإعادة القسرية للنظام')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeletePrinter = async (printerId: number) => {
    try {
      const result = await deletePrinter(printerId)
      if (result.success) {
        showNotification('success', 'تم حذف الطابعة بنجاح')
      } else {
        showNotification('error', result.error || 'فشل في حذف الطابعة')
      }
    } catch (error) {
      showNotification('error', 'فشل في حذف الطابعة')
    }
  }

  const renderNavigation = () => (
    <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
      <div className="grid grid-cols-1 gap-2">
        {[
          {
            id: 'services',
            label: 'الخدمات',
            icon: Users,
            count: services.length,
            description: 'إدارة تعريفات الخدمات'
          },
          {
            id: 'windows',
            label: 'النوافذ',
            icon: Monitor,
            count: windows.length,
            description: 'تكوين نوافذ العرض'
          },
          {
            id: 'printers',
            label: 'الطابعات',
            icon: Printer,
            count: printers.length,
            description: 'إعداد وإدارة الطابعات'
          },
          {
            id: 'system',
            label: 'النظام',
            icon: Settings,
            count: 0,
            description: 'إعدادات النظام والتحكم'
          }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`group relative flex items-center justify-between p-4 rounded-lg text-left transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-[1.02]'
                : 'text-gray-600 hover:bg-gray-50 hover:shadow-md border border-transparent hover:border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                activeTab === tab.id
                  ? 'bg-white/20'
                  : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <tab.icon className={`w-5 h-5 ${
                  activeTab === tab.id ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <div className={`font-medium ${
                  activeTab === tab.id ? 'text-white' : 'text-gray-900'
                }`}>
                  {tab.label}
                </div>
                <div className={`text-xs ${
                  activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {tab.description}
                </div>
              </div>
            </div>
            {tab.count > 0 && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )

  const renderModal = (
    isOpen: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-gray-900">
            {children}
          </div>
        </div>
      </div>
    )
  }

  const renderServicesTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الخدمات</h2>
          <p className="text-gray-600">إنشاء وإدارة تعريفات الخدمات</p>
        </div>
        <button
          onClick={() => setShowAddService(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
        >
          <Plus className="w-6 h-6 mr-2" />
          إضافة خدمة
        </button>
      </div>

      {servicesLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">جاري تحميل الخدمات...</p>
        </div>
      ) : servicesError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{servicesError}</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div key={service.id} className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-100 transition-all duration-200 hover:border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    تم الإنشاء: {new Date(service.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => {
                      setEditingService(service)
                      setNewServiceName(service.name)
                    }}
                    className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تعديل الخدمة"
                  >
                    <Edit className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف الخدمة"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                {service.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderWindowsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة النوافذ</h2>
          <p className="text-gray-600">تكوين نوافذ العرض وتخصيص الخدمات</p>
        </div>
      </div>

      {windowsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">جاري تحميل النوافذ...</p>
        </div>
      ) : windowsError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{windowsError}</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWindows.map((window) => {
            const assignedService = services.find(s => s.id === window.service_id)
            return (
              <div key={window.id} className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-100 transition-all duration-200 hover:border-blue-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">رقم الشباك: {window.id}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">اسم الخدمة المسؤول عنها:</span> {assignedService ? assignedService.name : 'لا توجد خدمة مخصصة'}
                      </p>
                      <p className="text-xs text-gray-400">
                        حالة الاتصال: {window.device_connected ? 'متصل' : 'غير متصل'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => {
                        setShowAssignServices(window)
                        setSelectedServiceId(window.service_id || null)
                      }}
                      className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تغيير الخدمة"
                    >
                      <Settings className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleDeleteWindow(window.id)}
                      className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف الشباك"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {window.service_id && assignedService && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-blue-800">{assignedService.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveService(window.id)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="إلغاء تخصيص الخدمة"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {!window.service_id && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 text-center">لم يتم تخصيص خدمة لهذا الشباك</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderPrintersTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الطابعات</h2>
          <p className="text-gray-600">إعداد وإدارة طابعات النظام</p>
        </div>
        <button
          onClick={loadPrinters}
          disabled={isLoadingPrinters}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-6 h-6 mr-2 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {isLoadingPrinters ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">جاري تحميل الطابعات...</p>
        </div>
      ) : printersError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{printersError}</span>
          </div>
        </div>
      ) : filteredPrinters.length === 0 ? (
        <div className="text-center py-8">
          <Printer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد طابعات متاحة</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrinters.map((printer) => (
            <div key={printer.id || printer.printer_name || printer.name} className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-100 transition-all duration-200 hover:border-blue-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {printer.printer_name || printer.name || 'اسم الطابعة غير متوفر'}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {printer.manufacturer && (
                      <div>
                        <span className="font-medium">الشركة المصنعة:</span> {printer.manufacturer}
                      </div>
                    )}
                    {printer.model && (
                      <div>
                        <span className="font-medium">الموديل:</span> {printer.model}
                      </div>
                    )}
                    {printer.status && (
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          printer.status === 'Ready' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">الحالة:</span> {printer.status === 'Ready' ? 'جاهز' : 'غير جاهز'}
                      </div>
                    )}
                    {printer.location && (
                      <div>
                        <span className="font-medium">الموقع:</span> {printer.location}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleDeletePrinter(printer.id)}
                    className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف الطابعة"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">إدارة النظام</h2>
        <p className="text-gray-600">إعدادات النظام وأدوات التحكم</p>
      </div>

      <div className="grid gap-6">
        {/* System Status */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-500" />
            حالة النظام
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <Database className="w-6 h-6 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-green-700 font-medium">قاعدة البيانات</p>
                  <p className="font-semibold text-green-900">متصلة</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Zap className="w-6 h-6 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">الخادم</p>
                  <p className="font-semibold text-blue-900">متصل</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Controls */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-blue-500" />
            أدوات التحكم بالنظام
          </h3>
          <div className="space-y-4">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-4 rounded-xl hover:from-yellow-600 hover:to-yellow-700 flex items-center justify-center disabled:opacity-50 font-medium shadow-lg transition-all duration-200"
            >
              <RotateCcw className={`w-6 h-6 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'جاري إعادة التعيين...' : 'إعادة تعيين النظام'}
            </button>

            <button
              onClick={handleForceReset}
              disabled={isResetting}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl hover:from-red-600 hover:to-red-700 flex items-center justify-center disabled:opacity-50 font-medium shadow-lg transition-all duration-200"
            >
              <Shield className={`w-6 h-6 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'جاري الإعادة القسرية...' : 'إعادة تعيين قسرية'}
            </button>
          </div>
        </div>

        {/* Reset Status */}
        {resetStatus && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">حالة إعادة التعيين</h3>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto border">
              {JSON.stringify(resetStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <ConnectionGuard
      screenType="admin"
      isReady={isConnected}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isDiscovering={isDiscovering}
      isRegistering={isRegistering}
      connectionError={connectionError}
      discoveryError={discoveryError}
      registrationError={registrationError}
      serverInfo={serverInfo}
      deviceInfo={deviceInfo}
      onRetry={reconnect}
      onInitialize={() => initialize('admin')}
    >
      <DataLoadingGuard
        isLoading={servicesLoading || windowsLoading}
        error={servicesError || windowsError}
        data={services.length > 0 || windows.length > 0 ? { services, windows } : null}
        onRetry={() => {
          loadServices()
          loadWindows()
        }}
      >
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Shield className="w-8 h-8 text-blue-500 mr-3" />
                  لوحة الإدارة
                </h1>
                <p className="text-gray-600 mt-1">إدارة النظام والتحكم بجميع العمليات</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 group"
                  title="تحديث البيانات"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="ml-2 text-sm font-medium hidden sm:block">تحديث</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-green-600 rounded-lg hover:bg-green-50 transition-all duration-200"
                  title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  <span className="ml-2 text-sm font-medium hidden sm:block">
                    {isFullscreen ? "إنهاء" : "ملء الشاشة"}
                  </span>
                </button>
                <button
                  onClick={handleExit}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200"
                  title="إغلاق التطبيق"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="ml-2 text-sm font-medium hidden sm:block">إغلاق</span>
                </button>
              </div>
            </div>
          </header>

          {/* Notification */}
          {notification && (
            <div className={`mx-6 mt-4 p-4 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                {notification.type === 'success' ? (
                  <div className="p-1 bg-green-100 rounded-full mr-3">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="p-1 bg-red-100 rounded-full mr-3">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`p-1 rounded-full hover:bg-opacity-20 transition-colors ${
                  notification.type === 'success' ? 'hover:bg-green-600' : 'hover:bg-red-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Content */}
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="lg:w-80 space-y-6">
                  {renderNavigation()}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    {activeTab === 'services' && renderServicesTab()}
                    {activeTab === 'windows' && renderWindowsTab()}
                    {activeTab === 'printers' && renderPrintersTab()}
                    {activeTab === 'system' && renderSystemTab()}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Modals */}
          {renderModal(
            showAddService,
            () => {
              setShowAddService(false)
              setNewServiceName('')
            },
            'إضافة خدمة جديدة',
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الخدمة</label>
                <input
                  type="text"
                  placeholder="أدخل اسم الخدمة..."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddService(false)
                    setNewServiceName('')
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddService}
                  disabled={!newServiceName.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  إضافة الخدمة
                </button>
              </div>
            </div>
          )}

          {renderModal(
            !!editingService,
            () => {
              setEditingService(null)
              setNewServiceName('')
            },
            'تعديل الخدمة',
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الخدمة</label>
                <input
                  type="text"
                  placeholder="أدخل اسم الخدمة..."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setEditingService(null)
                    setNewServiceName('')
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditService}
                  disabled={!newServiceName.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          )}

          {renderModal(
            !!showAssignServices,
            () => {
              setShowAssignServices(null)
              setSelectedServiceId(null)
            },
            'تخصيص الخدمات',
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                اختر الخدمة المراد تخصيصها للشباك رقم: <span className="font-semibold text-blue-800">{showAssignServices?.id}</span>
              </p>

              {/* No Service Option */}
              <div className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedServiceId === null ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`} onClick={() => setSelectedServiceId(null)}>
                <input
                  type="radio"
                  name="service-selection"
                  checked={selectedServiceId === null}
                  onChange={() => setSelectedServiceId(null)}
                  className="mr-3 text-blue-600"
                />
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">عدم تخصيص أي خدمة</span>
                  {selectedServiceId === null && (
                    <span className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      محدد
                    </span>
                  )}
                </div>
              </div>

              {/* Services List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {services.map((service) => (
                  <div key={service.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedServiceId === service.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`} onClick={() => setSelectedServiceId(service.id)}>
                    <input
                      type="radio"
                      name="service-selection"
                      checked={selectedServiceId === service.id}
                      onChange={() => setSelectedServiceId(service.id)}
                      className="mr-3 text-blue-600"
                    />
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-blue-500 mr-3" />
                      <span className="font-medium text-gray-900">{service.name}</span>
                      {selectedServiceId === service.id && (
                        <span className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          محدد
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAssignServices(null)
                    setSelectedServiceId(null)
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveServiceAssignment}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  حفظ التخصيص
                </button>
              </div>

              {services.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">لا توجد خدمات متاحة للتخصيص</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DataLoadingGuard>
    </ConnectionGuard>
  )
}

export default AdminScreen
