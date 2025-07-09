import React from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface DataLoadingGuardProps {
  children: React.ReactNode
  isLoading: boolean
  error: string | null
  data: any[] | any | null
  onRetry?: () => void
  loadingMessage?: string
  emptyMessage?: string
  errorMessage?: string
  className?: string
  showEmptyState?: boolean
}

/**
 * Data Loading Guard Component - حارس تحميل البيانات
 * يضمن عرض البيانات فقط بعد تحميلها بنجاح
 * يوفر واجهة موحدة لحالات التحميل والأخطاء والبيانات الفارغة
 */
export const DataLoadingGuard: React.FC<DataLoadingGuardProps> = ({
  children,
  isLoading,
  error,
  data,
  onRetry,
  loadingMessage = 'جاري التحميل...',
  emptyMessage = 'لا توجد بيانات متاحة',
  errorMessage,
  className = '',
  showEmptyState = true
}) => {
  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">{loadingMessage}</h3>
          <p className="text-sm text-gray-500">يرجى الانتظار</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-700 mb-2">حدث خطأ</h3>
          <p className="text-sm text-red-600 mb-4 break-words">
            {errorMessage || error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    )
  }

  // Check if data is empty (for arrays or null/undefined)
  const isEmpty = Array.isArray(data)
    ? data.length === 0
    : data === null || data === undefined

  // Show empty state
  if (isEmpty && showEmptyState) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">{emptyMessage}</h3>
          <p className="text-sm text-gray-500">لا توجد عناصر للعرض</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </button>
          )}
        </div>
      </div>
    )
  }

  // Show children if data is loaded successfully
  return <>{children}</>
}
