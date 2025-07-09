import React, { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw, Server } from 'lucide-react'

interface ConnectionGuardProps {
  children: React.ReactNode
  screenType: 'admin' | 'display' | 'window' | 'customer'
  isReady: boolean
  isConnected: boolean
  isConnecting: boolean
  isDiscovering: boolean
  isRegistering: boolean
  connectionError: string | null
  discoveryError: string | null
  registrationError: string | null
  serverInfo: any
  deviceInfo: any
  onRetry: () => void
  onInitialize: () => void
  className?: string
}

/**
 * Connection Guard Component - الحارس الموحد للاتصال
 * يضمن عدم عرض البيانات قبل اكتمال الاتصال والتسجيل
 * يوفر واجهة موحدة لجميع الشاشات مع أزرار إعادة المحاولة
 */
export const ConnectionGuard: React.FC<ConnectionGuardProps> = ({
  children,
  screenType,
  isReady,
  isConnected,
  isConnecting,
  isDiscovering,
  isRegistering,
  connectionError,
  discoveryError,
  registrationError,
  serverInfo,
  deviceInfo,
  onRetry,
  onInitialize,
  className = ''
}) => {
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false)
  const [lastConnectionTime, setLastConnectionTime] = useState<Date | null>(null)

  // Track connection establishment
  useEffect(() => {
    if (isConnected && !lastConnectionTime) {
      setLastConnectionTime(new Date())
    }
  }, [isConnected, lastConnectionTime])

  // Get connection status and display info
  const getConnectionStatus = () => {
    if (isDiscovering) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-blue-500" />,
        title: 'البحث عن الخادم...',
        subtitle: 'جاري البحث عن خادم CASNOS في الشبكة',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        showRetry: false
      }
    }

    if (isConnecting) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-green-500" />,
        title: 'جاري الاتصال...',
        subtitle: `الاتصال بالخادم ${serverInfo?.ip}:${serverInfo?.port}`,
        color: 'bg-green-50 border-green-200 text-green-800',
        showRetry: false
      }
    }

    if (isRegistering) {
      return {
        icon: <Loader2 className="w-6 h-6 animate-spin text-purple-500" />,
        title: 'جاري تسجيل الجهاز...',
        subtitle: `تسجيل جهاز ${screenType} في النظام`,
        color: 'bg-purple-50 border-purple-200 text-purple-800',
        showRetry: false
      }
    }

    if (discoveryError) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-red-500" />,
        title: 'فشل في اكتشاف الخادم',
        subtitle: 'لم يتم العثور على خادم CASNOS في الشبكة',
        color: 'bg-red-50 border-red-200 text-red-800',
        showRetry: true
      }
    }

    if (connectionError) {
      return {
        icon: <WifiOff className="w-6 h-6 text-red-500" />,
        title: 'فشل في الاتصال',
        subtitle: connectionError,
        color: 'bg-red-50 border-red-200 text-red-800',
        showRetry: true
      }
    }

    if (registrationError) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
        title: 'فشل في تسجيل الجهاز',
        subtitle: registrationError,
        color: 'bg-orange-50 border-orange-200 text-orange-800',
        showRetry: true
      }
    }

    if (!isReady) {
      return {
        icon: <Server className="w-6 h-6 text-gray-500" />,
        title: 'في انتظار الاتصال...',
        subtitle: 'تحضير النظام للاتصال',
        color: 'bg-gray-50 border-gray-200 text-gray-800',
        showRetry: true
      }
    }

    return null
  }

  const status = getConnectionStatus()

  // If ready, show the children content
  if (isReady && isConnected) {
    return (
      <div className={`relative ${className}`}>


        {/* Main Content */}
        {children}
      </div>
    )
  }

  // Show connection status screen
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 ${className}`}>
      <div className="max-w-md w-full">
        {/* Main Connection Status Card */}
        <div className={`rounded-2xl border-2 p-8 text-center ${status?.color || 'bg-gray-50 border-gray-200'}`}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {status?.icon || <Server className="w-12 h-12 text-gray-400" />}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2">
            {status?.title || 'تحضير النظام...'}
          </h2>

          {/* Subtitle */}
          <p className="text-sm opacity-80 mb-6">
            {status?.subtitle || 'جاري تحضير النظام'}
          </p>

          {/* Connection Info */}
          {serverInfo && (
            <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-6 text-sm">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Server className="w-4 h-4" />
                <span className="font-medium">معلومات الخادم</span>
              </div>
              <div className="text-gray-600">
                {serverInfo.ip}:{serverInfo.port}
              </div>
            </div>
          )}

          {/* Device Info */}
          {deviceInfo && (
            <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-6 text-sm">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="font-medium">معرف الجهاز</span>
              </div>
              <div className="text-gray-600 font-mono">
                {deviceInfo.device_id}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            {status?.showRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            )}

            {!isConnected && (
              <button
                onClick={onInitialize}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Wifi className="w-4 h-4" />
                <span>بدء الاتصال</span>
              </button>
            )}

            {/* Advanced Info Toggle */}
            <button
              onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {showAdvancedInfo ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </button>
          </div>

          {/* Advanced Information */}
          {showAdvancedInfo && (
            <div className="mt-6 bg-white bg-opacity-50 rounded-lg p-4 text-left text-xs space-y-2">
              <div className="font-medium text-center mb-3">معلومات تقنية</div>

              <div className="space-y-1">
                <div><strong>نوع الشاشة:</strong> {screenType}</div>
                <div><strong>حالة الاتصال:</strong> {isConnected ? 'متصل' : 'غير متصل'}</div>
                <div><strong>حالة الاكتشاف:</strong> {isDiscovering ? 'جاري البحث' : 'مكتمل'}</div>
                <div><strong>حالة التسجيل:</strong> {isRegistering ? 'جاري التسجيل' : 'مكتمل'}</div>
                <div><strong>النظام جاهز:</strong> {isReady ? 'نعم' : 'لا'}</div>

                {lastConnectionTime && (
                  <div>
                    <strong>آخر اتصال:</strong> {lastConnectionTime.toLocaleTimeString('ar-SA')}
                  </div>
                )}

                {(connectionError || discoveryError || registrationError) && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="font-medium text-red-600 mb-1">تفاصيل الخطأ:</div>
                    <div className="text-red-500 break-words">
                      {connectionError || discoveryError || registrationError}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Progress (if actively connecting) */}
        {(isDiscovering || isConnecting || isRegistering) && (
          <div className="mt-4 bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>تقدم الاتصال</span>
              <span>
                {isDiscovering ? '1/3' : isConnecting ? '2/3' : isRegistering ? '3/3' : '0/3'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: isDiscovering ? '33%' : isConnecting ? '66%' : isRegistering ? '100%' : '0%'
                }}
              />
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-lg p-4 border">
          <h3 className="font-medium text-gray-800 mb-3 text-center">نصائح لحل المشاكل</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span>تأكد من تشغيل خادم CASNOS</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span>تحقق من اتصال الشبكة</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span>تأكد من وجود الجهاز في نفس الشبكة مع الخادم</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500">•</span>
              <span>تحقق من إعدادات الـ IP والمنفذ</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
