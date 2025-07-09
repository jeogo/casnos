/**
 * 🖨️ Hook إدارة الطابعات للعملاء (Customer Printer Setup)
 *
 * التوضيح المحدث:
 * - 💻 يعرض الطابعات المحلية + المحفوظة في قاعدة البيانات
 * - ❌ لا يسجل الطابعات في قاعدة البيانات
 * - ⚡ اكتشاف وطباعة سريعة
 * - 📱 للاستخدام في شاشة العملاء فقط
 *
 * تسجيل الطابعات في قاعدة البيانات يتم فقط من شاشة العرض (Display Screen)
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface PrinterInfo {
  id: string
  name: string
  isDefault: boolean
  status: 'ready' | 'busy' | 'offline' | 'error'
  source?: 'local' | 'database' // نوع مصدر الطابعة
  database_id?: number // معرف في قاعدة البيانات
}

interface CustomerPrinterSetupState {
  // Printers data
  printers: PrinterInfo[]
  localPrinters: PrinterInfo[] // الطابعات المحلية فقط
  databasePrinters: PrinterInfo[] // الطابعات من قاعدة البيانات فقط
  selectedPrinter: PrinterInfo | null

  // Loading states
  isDetecting: boolean
  isLoadingDatabase: boolean

  // Error states
  error: string | null

  // Actions
  detectPrinters: () => Promise<void>
  loadDatabasePrinters: (deviceId: string) => Promise<void>
  loadAllDatabasePrinters: () => Promise<void>
  setPrinter: (printerId: string) => void
  clearError: () => void
}

/**
 * Hook لإدارة إعداد الطابعة للعملاء
 * Customer Printer Setup Hook
 *
 * يجب استخدام هذا الـ hook بعد اكتمال التهيئة فقط
 */
export const useCustomerPrinterSetup = (isInitialized: boolean = false): CustomerPrinterSetupState => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [localPrinters, setLocalPrinters] = useState<PrinterInfo[]>([])
  const [databasePrinters, setDatabasePrinters] = useState<PrinterInfo[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterInfo | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // منع التكرار في العمليات
  const detectingRef = useRef(false)
  const databaseLoadingRef = useRef(false)
  const lastLoadedDeviceId = useRef<string | null>(null) // تتبع آخر device ID تم جلب طابعاته

  // اكتشاف الطابعات المتاحة
  const detectPrinters = useCallback(async () => {
    if (!isInitialized) {
      console.log('[CUSTOMER-PRINTER-SETUP] ⏭️ System not initialized yet, skipping printer detection...')
      return
    }

    if (isDetecting || detectingRef.current) {
      console.log('[CUSTOMER-PRINTER-SETUP] ⏭️ Detection already in progress, skipping...')
      return
    }

    try {
      detectingRef.current = true
      setIsDetecting(true)
      setError(null)

      console.log('[CUSTOMER-PRINTER-SETUP] 🖨️ Detecting available local printers...')

      // جلب قائمة الطابعات المحلية من النظام
      const result = await window.api.getLocalPrinters()

      if (result && Array.isArray(result)) {
        const detectedPrinters = result.map((printer: any) => ({
          id: printer.id || printer.name,
          name: printer.name,
          isDefault: printer.isDefault || false,
          status: printer.status || 'ready',
          source: 'local' as const
        }))

        setLocalPrinters(detectedPrinters)

        // دمج الطابعات المحلية مع طابعات قاعدة البيانات
        const combinedPrinters = [...detectedPrinters, ...databasePrinters]
        setPrinters(combinedPrinters)

        // اختيار الطابعة الافتراضية تلقائياً
        let defaultPrinter: PrinterInfo | null = null

        // أولاً: البحث عن الطابعة المحفوظة محلياً
        const savedPrinterId = localStorage.getItem('selectedPrinterId')
        if (savedPrinterId) {
          const savedPrinter = combinedPrinters.find(p => p.id === savedPrinterId)
          if (savedPrinter) {
            defaultPrinter = savedPrinter
            console.log('[CUSTOMER-PRINTER-SETUP] 💾 Using saved printer:', defaultPrinter.name, `(${defaultPrinter.source})`)
          }
        }

        // ثانياً: إذا لم توجد الطابعة المحفوظة، استخدم الافتراضية من النظام
        if (!defaultPrinter) {
          const systemDefault = detectedPrinters.find(p => p.isDefault) || combinedPrinters[0]
          if (systemDefault) {
            defaultPrinter = systemDefault
            console.log('[CUSTOMER-PRINTER-SETUP] ✅ Using default printer:', defaultPrinter.name, `(${defaultPrinter.source})`)
          }
        }

        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter)
        }

        console.log('[CUSTOMER-PRINTER-SETUP] ✅ Printers detected:', detectedPrinters.length)
      } else {
        throw new Error('Failed to detect printers')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error detecting printers'
      console.error('[CUSTOMER-PRINTER-SETUP] ❌ Failed to detect printers:', errorMessage)
      setError(errorMessage)

      // في حالة فشل اكتشاف الطابعات، إنشاء طابعة افتراضية
      const defaultPrinter: PrinterInfo = {
        id: 'default-printer',
        name: 'Default Printer',
        isDefault: true,
        status: 'ready'
      }
      setPrinters([defaultPrinter])
      setSelectedPrinter(defaultPrinter)
      console.log('[CUSTOMER-PRINTER-SETUP] 🔄 Using fallback default printer')
    } finally {
      setIsDetecting(false)
      detectingRef.current = false
    }
  }, [isInitialized, isDetecting, databasePrinters])

  // جلب الطابعات المسجلة في قاعدة البيانات (جميع الطابعات بدون تحديد device)
  const loadAllDatabasePrinters = useCallback(async () => {
    if (isLoadingDatabase || databaseLoadingRef.current) {
      console.log('[CUSTOMER-PRINTER-SETUP] ⏭️ Database loading already in progress, skipping...')
      return
    }

    try {
      databaseLoadingRef.current = true
      setIsLoadingDatabase(true)
      setError(null)

      console.log('[CUSTOMER-PRINTER-SETUP] 📋 Loading all registered printers from database')

      const result = await window.api.getAllRegisteredPrinters()

      if (result?.success && result.printers) {
        const dbPrinters = result.printers.map((printer: any) => ({
          id: printer.printer_id || `db_${printer.id}`,
          name: printer.printer_name || printer.name,
          isDefault: printer.is_default || false,
          status: 'ready' as const,
          source: 'database' as const,
          database_id: printer.id
        }))

        setDatabasePrinters(dbPrinters)

        // دمج مع الطابعات المحلية
        const combinedPrinters = [...localPrinters, ...dbPrinters]
        setPrinters(combinedPrinters)

        console.log(`[CUSTOMER-PRINTER-SETUP] ✅ Loaded ${dbPrinters.length} database printers`)
      } else {
        console.log('[CUSTOMER-PRINTER-SETUP] ℹ️ No registered printers found in database')
        setDatabasePrinters([])

        // إذا لم تكن هناك طابعات في قاعدة البيانات، اعرض المحلية فقط
        setPrinters([...localPrinters])
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load database printers'
      console.error('[CUSTOMER-PRINTER-SETUP] ❌ Failed to load database printers:', error)
      setError(errorMessage)

      // في حالة الخطأ، اعرض الطابعات المحلية فقط
      setPrinters([...localPrinters])
    } finally {
      setIsLoadingDatabase(false)
      databaseLoadingRef.current = false
    }
  }, [localPrinters])

  // جلب الطابعات المسجلة في قاعدة البيانات لجهاز معين (الدالة القديمة - احتياطية)
  const loadDatabasePrinters = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      console.log('[CUSTOMER-PRINTER-SETUP] ⚠️ No device ID provided for database printers')
      return
    }

    // تحقق من أن هذا Device ID لم يتم جلب طابعاته بالفعل
    if (lastLoadedDeviceId.current === deviceId && databasePrinters.length > 0) {
      console.log('[CUSTOMER-PRINTER-SETUP] ℹ️ Database printers already loaded for this device, skipping...')
      return
    }

    if (isLoadingDatabase || databaseLoadingRef.current) {
      console.log('[CUSTOMER-PRINTER-SETUP] ⏭️ Database loading already in progress, skipping...')
      return
    }

    try {
      databaseLoadingRef.current = true
      setIsLoadingDatabase(true)
      setError(null)

      console.log('[CUSTOMER-PRINTER-SETUP] 📋 Loading registered printers for device:', deviceId)

      const result = await window.api.getDeviceRegisteredPrinters(deviceId)

      if (result?.success && result.printers) {
        const dbPrinters = result.printers.map((printer: any) => ({
          id: printer.printer_id || `db_${printer.id}`,
          name: printer.printer_name || printer.name,
          isDefault: printer.is_default || false,
          status: 'ready' as const,
          source: 'database' as const,
          database_id: printer.id
        }))

        setDatabasePrinters(dbPrinters)

        // دمج مع الطابعات المحلية
        const combinedPrinters = [...localPrinters, ...dbPrinters]
        setPrinters(combinedPrinters)

        // حفظ Device ID الذي تم جلب طابعاته
        lastLoadedDeviceId.current = deviceId

        console.log(`[CUSTOMER-PRINTER-SETUP] ✅ Loaded ${dbPrinters.length} database printers`)
      } else {
        console.log('[CUSTOMER-PRINTER-SETUP] ℹ️ No registered printers found for device')
        setDatabasePrinters([])

        // إذا لم تكن هناك طابعات في قاعدة البيانات، اعرض المحلية فقط
        setPrinters([...localPrinters])

        // حفظ Device ID حتى لو لم تكن هناك طابعات
        lastLoadedDeviceId.current = deviceId
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load database printers'
      console.error('[CUSTOMER-PRINTER-SETUP] ❌ Failed to load database printers:', error)
      setError(errorMessage)

      // في حالة الخطأ، اعرض الطابعات المحلية فقط
      setPrinters([...localPrinters])
    } finally {
      setIsLoadingDatabase(false)
      databaseLoadingRef.current = false
    }
  }, [localPrinters, databasePrinters.length]) // إضافة databasePrinters.length للتحقق

  // ❌ تم إزالة وظيفة تسجيل الطابعات - شاشة العميل تستخدم الطابعات المحلية فقط
  // registerPrintersToDatabase - لا نحتاجها هنا

  // اختيار طابعة محددة وحفظها كافتراضية
  const setPrinter = useCallback(async (printerId: string) => {
    const printer = printers.find(p => p.id === printerId)
    if (printer) {
      try {
        setSelectedPrinter(printer)

        // حفظ الطابعة المختارة محلياً
        localStorage.setItem('selectedPrinterId', printerId)

        // محاولة حفظها في قاعدة البيانات كذلك (اختياري)
        try {
          // يمكن إضافة API call هنا لحفظ الطابعة الافتراضية في قاعدة البيانات
          console.log('[CUSTOMER-PRINTER-SETUP] 💾 Printer preference saved locally:', printer.name)
        } catch (dbError) {
          console.warn('[CUSTOMER-PRINTER-SETUP] ⚠️ Failed to save printer to database:', dbError)
          // لا نرمي error هنا لأن الحفظ المحلي نجح
        }

        console.log('[CUSTOMER-PRINTER-SETUP] 📌 Printer selected:', printer.name)
      } catch (error) {
        console.error('[CUSTOMER-PRINTER-SETUP] ❌ Failed to set printer:', error)
        setError('فشل في اختيار الطابعة')
      }
    } else {
      console.warn('[CUSTOMER-PRINTER-SETUP] ⚠️ Printer not found:', printerId)
    }
  }, [printers])

  // مسح الأخطاء
  const clearError = useCallback(() => {
    setError(null)
    // إعادة تعيين المرجع في حالة وجود مشكلة
    detectingRef.current = false
  }, [])

  // اكتشاف الطابعات تلقائياً بعد اكتمال التهيئة
  useEffect(() => {
    if (isInitialized && printers.length === 0 && !isDetecting && !detectingRef.current) {
      console.log('[CUSTOMER-PRINTER-SETUP] 🚀 System initialized, auto-detecting printers...')
      detectPrinters()
    }
  }, [isInitialized, printers.length, isDetecting, detectPrinters])

  return {
    // Printers data
    printers,
    localPrinters,
    databasePrinters,
    selectedPrinter,

    // Loading states
    isDetecting,
    isLoadingDatabase,

    // Error states
    error,

    // Actions
    detectPrinters,
    loadDatabasePrinters, // للجهاز المحدد (احتياطية)
    loadAllDatabasePrinters, // جميع الطابعات (جديدة)
    setPrinter,
    clearError
  }
}
