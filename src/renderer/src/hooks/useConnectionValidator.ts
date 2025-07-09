import { useState, useCallback } from 'react'

/**
 * Connection states for validation
 */
export type ConnectionState =
  | 'disconnected'      // Not connected
  | 'discovering'       // Finding server
  | 'connecting'        // Connecting to server
  | 'registering'       // Registering device
  | 'initializing'      // Setting up services
  | 'ready'             // Fully ready
  | 'error'             // Error state

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  state: ConnectionState
  error?: string
  progress: number // 0-100
}

/**
 * Connection validation hook
 * Validates that all connection steps are complete before allowing data display
 */
export const useConnectionValidator = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    state: 'disconnected',
    progress: 0
  })

  const [isRetrying, setIsRetrying] = useState(false)

  /**
   * Validate connection state based on all required conditions
   */
  const validateConnection = useCallback((
    isDiscovering: boolean,
    isConnecting: boolean,
    isRegistering: boolean,
    isConnected: boolean,
    serverInfo: any,
    deviceInfo: any,
    discoveryError: string | null,
    connectionError: string | null,
    registrationError: string | null
  ): ValidationResult => {
    // Check for errors first
    if (discoveryError) {
      return {
        isValid: false,
        state: 'error',
        error: `Discovery failed: ${discoveryError}`,
        progress: 10
      }
    }

    if (connectionError) {
      return {
        isValid: false,
        state: 'error',
        error: `Connection failed: ${connectionError}`,
        progress: 30
      }
    }

    if (registrationError) {
      return {
        isValid: false,
        state: 'error',
        error: `Registration failed: ${registrationError}`,
        progress: 50
      }
    }

    // Check discovery state
    if (isDiscovering) {
      return {
        isValid: false,
        state: 'discovering',
        progress: 20
      }
    }

    // Check if server is discovered
    if (!serverInfo) {
      return {
        isValid: false,
        state: 'discovering',
        progress: 10
      }
    }

    // Check connection state
    if (isConnecting) {
      return {
        isValid: false,
        state: 'connecting',
        progress: 40
      }
    }

    // Check if connected
    if (!isConnected) {
      return {
        isValid: false,
        state: 'disconnected',
        progress: 15
      }
    }

    // Check registration state
    if (isRegistering) {
      return {
        isValid: false,
        state: 'registering',
        progress: 60
      }
    }

    // Check if device info is available
    if (!deviceInfo) {
      return {
        isValid: false,
        state: 'initializing',
        progress: 70
      }
    }

    // All checks passed - system is ready
    return {
      isValid: true,
      state: 'ready',
      progress: 100
    }
  }, [])

  /**
   * Get human-readable status text
   */
  const getStatusText = useCallback((state: ConnectionState, isRetrying: boolean): string => {
    if (isRetrying) {
      return 'إعادة المحاولة... / Retrying...'
    }

    switch (state) {
      case 'disconnected':
        return 'غير متصل / Disconnected'
      case 'discovering':
        return 'البحث عن الخادم... / Discovering Server...'
      case 'connecting':
        return 'جاري الاتصال... / Connecting...'
      case 'registering':
        return 'تسجيل الجهاز... / Registering Device...'
      case 'initializing':
        return 'تهيئة النظام... / Initializing System...'
      case 'ready':
        return 'جاهز / Ready'
      case 'error':
        return 'خطأ في الاتصال / Connection Error'
      default:
        return 'حالة غير معروفة / Unknown State'
    }
  }, [])

  /**
   * Get status color based on state
   */
  const getStatusColor = useCallback((state: ConnectionState): string => {
    switch (state) {
      case 'disconnected':
        return '#ef4444' // red
      case 'discovering':
        return '#f59e0b' // amber
      case 'connecting':
        return '#3b82f6' // blue
      case 'registering':
        return '#8b5cf6' // purple
      case 'initializing':
        return '#06b6d4' // cyan
      case 'ready':
        return '#10b981' // green
      case 'error':
        return '#dc2626' // red
      default:
        return '#6b7280' // gray
    }
  }, [])

  /**
   * Get status icon based on state
   */
  const getStatusIcon = useCallback((state: ConnectionState): string => {
    switch (state) {
      case 'disconnected':
        return '🔴'
      case 'discovering':
        return '🔍'
      case 'connecting':
        return '🔌'
      case 'registering':
        return '📱'
      case 'initializing':
        return '⚙️'
      case 'ready':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '❓'
    }
  }, [])

  /**
   * Update validation result
   */
  const updateValidation = useCallback((
    isDiscovering: boolean,
    isConnecting: boolean,
    isRegistering: boolean,
    isConnected: boolean,
    serverInfo: any,
    deviceInfo: any,
    discoveryError: string | null,
    connectionError: string | null,
    registrationError: string | null
  ) => {
    const result = validateConnection(
      isDiscovering,
      isConnecting,
      isRegistering,
      isConnected,
      serverInfo,
      deviceInfo,
      discoveryError,
      connectionError,
      registrationError
    )

    setValidationResult(result)
  }, [validateConnection])

  /**
   * Set retry state
   */
  const setRetryState = useCallback((retrying: boolean) => {
    setIsRetrying(retrying)
  }, [])

  return {
    // Validation state
    validationResult,
    isRetrying,

    // Actions
    updateValidation,
    setRetryState,

    // Utilities
    getStatusText,
    getStatusColor,
    getStatusIcon,

    // Computed properties
    isReady: validationResult.isValid && validationResult.state === 'ready',
    hasError: validationResult.state === 'error',
    progress: validationResult.progress
  }
}
