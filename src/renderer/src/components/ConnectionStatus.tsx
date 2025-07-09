import React from 'react'
import { ValidationResult, ConnectionState } from '../hooks/useConnectionValidator'

interface ConnectionStatusProps {
  validationResult: ValidationResult
  isRetrying: boolean
  onRetry: () => void
  getStatusText: (state: ConnectionState, isRetrying: boolean) => string
  getStatusColor: (state: ConnectionState) => string
  getStatusIcon: (state: ConnectionState) => string
  showRetryButton?: boolean
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  validationResult,
  isRetrying,
  onRetry,
  getStatusText,
  getStatusColor,
  getStatusIcon,
  showRetryButton = true,
  className = ''
}) => {
  const { state, error, progress } = validationResult

  if (validationResult.isValid) {
    return null // Don't show anything when connection is ready
  }

  return (
    <div className={`connection-status ${className}`}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          {/* Status Icon */}
          <div className="mb-6">
            <div
              className="text-6xl mb-4"
              style={{ color: getStatusColor(state) }}
            >
              {getStatusIcon(state)}
            </div>

            {/* Status Text */}
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {getStatusText(state, isRetrying)}
            </h2>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 mb-4">
                {error}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getStatusColor(state)
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {progress}% مكتمل / Complete
            </p>
          </div>

          {/* Retry Button */}
          {showRetryButton && (state === 'error' || state === 'disconnected') && (
            <div className="space-y-3">
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRetrying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRetrying ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    جاري إعادة المحاولة... / Retrying...
                  </div>
                ) : (
                  'إعادة المحاولة / Retry Connection'
                )}
              </button>

              {/* Troubleshooting Tips */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                <p className="text-xs text-blue-700 mb-2 font-medium">
                  نصائح لحل المشاكل / Troubleshooting Tips:
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• تأكد من تشغيل خادم CASNOS / Make sure CASNOS server is running</li>
                  <li>• تحقق من اتصال الشبكة / Check your network connection</li>
                  <li>• تأكد من إعدادات IP والمنفذ / Verify server IP and port configuration</li>
                  <li>• تأكد من اتصال الجهاز بنفس الشبكة / Ensure device is on the same network</li>
                </ul>
              </div>
            </div>
          )}

          {/* Loading States */}
          {(state === 'discovering' || state === 'connecting' || state === 'registering' || state === 'initializing') && (
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatus
