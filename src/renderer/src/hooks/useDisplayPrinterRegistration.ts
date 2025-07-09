import { useState, useCallback, useRef } from 'react'

interface DisplayPrinterRegistrationState {
  // Loading states
  isRegistering: boolean

  // Error states
  error: string | null

  // Actions
  registerPrintersToDatabase: (deviceId: string) => Promise<{ success: boolean; message: string; registered: number }>
  clearError: () => void
}

/**
 * Hook لإدارة تسجيل الطابعات في قاعدة البيانات لشاشة العرض
 * Display Screen Printer Registration Hook
 *
 * يستخدم فقط في شاشة العرض (Display Screen) لتسجيل الطابعات في قاعدة البيانات
 */
export const useDisplayPrinterRegistration = (isInitialized: boolean = false): DisplayPrinterRegistrationState => {
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // منع التكرار في العمليات
  const registrationRef = useRef(false)

  // تسجيل الطابعات تلقائياً في قاعدة البيانات (للشاشة العرض فقط)
  const registerPrintersToDatabase = useCallback(async (deviceId: string) => {
    if (!isInitialized) {
      console.log('[DISPLAY-PRINTER-REGISTRATION] ⏭️ System not initialized yet, skipping...')
      return { success: false, message: 'System not initialized', registered: 0 }
    }

    if (registrationRef.current) {
      console.log('[DISPLAY-PRINTER-REGISTRATION] ⏭️ Registration already in progress, skipping...')
      return { success: true, message: 'Already in progress', registered: 0 }
    }

    // التحقق من التسجيل المسبق في localStorage
    const registrationKey = `displayPrintersRegistered_${deviceId}`;
    const cachedRegistration = localStorage.getItem(registrationKey);

    if (cachedRegistration) {
      const data = JSON.parse(cachedRegistration);
      const timeDiff = Date.now() - new Date(data.registeredAt).getTime();

      // إذا تم التسجيل خلال آخر 24 ساعة، تحقق من وجود طابعات في قاعدة البيانات
      if (timeDiff < 24 * 60 * 60 * 1000) {
        console.log('[DISPLAY-PRINTER-REGISTRATION] 🔍 Checking if printers still exist in database...');

        try {
          // التحقق من وجود طابعات في قاعدة البيانات
          const existingPrinters = await window.api.getDevicePrinters();
          const printerCount = existingPrinters?.data?.length || 0;

          console.log(`[DISPLAY-PRINTER-REGISTRATION] 📊 Found ${printerCount} printers in database`);

          // إذا كان هناك طابعات في قاعدة البيانات، تجاهل العملية
          if (printerCount > 0) {
            console.log('[DISPLAY-PRINTER-REGISTRATION] ⏭️ Printers already registered recently, skipping...');
            return {
              success: true,
              message: `Printers already registered: ${printerCount} printers`,
              registered: printerCount
            };
          } else {
            console.log('[DISPLAY-PRINTER-REGISTRATION] 🔄 No printers found in database, will re-register...');
            // إزالة الكاش وإعادة التسجيل
            localStorage.removeItem(registrationKey);
          }
        } catch (error) {
          console.error('[DISPLAY-PRINTER-REGISTRATION] ❌ Error checking database printers:', error);
          // في حالة الخطأ، إزالة الكاش وإعادة المحاولة
          localStorage.removeItem(registrationKey);
        }
      }
    }

    try {
      registrationRef.current = true
      setIsRegistering(true)
      setError(null)

      console.log('[DISPLAY-PRINTER-REGISTRATION] 🚀 Auto-registering local printers to database...')

      const result = await window.api.registerLocalPrintersToDatabase(deviceId)

      if (result.success) {
        console.log(`[DISPLAY-PRINTER-REGISTRATION] ✅ Printer registration completed: ${result.registered} printers`)

        // حفظ نتيجة التسجيل في localStorage
        localStorage.setItem(registrationKey, JSON.stringify({
          deviceId,
          registeredAt: new Date().toISOString(),
          count: result.registered,
          total: (result as any).total || result.registered,
          errors: (result as any).errors || []
        }));
      } else {
        console.warn('[DISPLAY-PRINTER-REGISTRATION] ⚠️ Printer registration had issues:', result.message)
        setError(result.message)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error registering printers'
      console.error('[DISPLAY-PRINTER-REGISTRATION] ❌ Failed to register printers:', errorMessage)
      setError(errorMessage)
      return { success: false, message: errorMessage, registered: 0 }
    } finally {
      registrationRef.current = false
      setIsRegistering(false)
    }
  }, [isInitialized])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    registrationRef.current = false
  }, [])

  return {
    // Loading states
    isRegistering,

    // Error states
    error,

    // Actions
    registerPrintersToDatabase,
    clearError
  }
}
