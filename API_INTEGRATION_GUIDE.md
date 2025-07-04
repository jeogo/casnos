# 🎯 CASNOS API Integration - دليل شامل للوظائف

## 📋 ملخص المهمة المكتملة

تم بنجاح إضافة جميع وظائف الـ API وSocket.IO المطلوبة إلى نظام CASNOS، مما يجعل النظام جاهزاً لتطوير أي واجهة جديدة بسهولة ووضوح.

## ✅ الملفات المضافة والمحدثة

### 1. ملفات Preload الأساسية
- **`src/preload/index.ts`** - جميع وظائف الـ API وSocket متاحة
- **`src/preload/index.d.ts`** - تعريفات TypeScript للوظائف

### 2. معالجات Main Process
- **`src/main/handlers/index.ts`** - تسجيل جميع المعالجات
- **`src/main/handlers/apiHandlers.ts`** - معالجات API REST الشاملة
- **`src/main/handlers/socketHandlers.ts`** - معالجات Socket.IO المباشرة

### 3. شاشة الاختبار
- **`src/renderer/src/components/ApiTestPanel.tsx`** - شاشة اختبار شاملة

## 🚀 الوظائف المتاحة

### 🌐 Network & Discovery
```typescript
// اكتشاف الخادم تلقائياً
const server = await window.api.discoverServerUdp()

// الاتصال بخادم محدد
const result = await window.api.connectToServer('192.168.1.100', 3001)

// فحص حالة الاتصال
const status = await window.api.getConnectionStatus()
```

### 🎫 Tickets Management
```typescript
// إنشاء تذكرة جديدة
const ticket = await window.api.createTicket(serviceId)

// الحصول على جميع التذاكر
const tickets = await window.api.getTickets()

// استدعاء تذكرة
const result = await window.api.callTicket(ticketId, windowId)

// خدمة تذكرة
const result = await window.api.serveTicket(ticketId, windowId)

// الحصول على إحصائيات
const stats = await window.api.getTicketStatistics()

// حالة الطابور
const queueStatus = await window.api.getQueueStatus()
```

### 🏢 Services Management
```typescript
// الحصول على جميع الخدمات
const services = await window.api.getServices()

// إنشاء خدمة جديدة
const service = await window.api.createService('خدمة جديدة')

// تحديث خدمة
const result = await window.api.updateService(serviceId, 'اسم محدث')
```

### 🪟 Windows Management
```typescript
// الحصول على جميع النوافذ
const windows = await window.api.getWindows()

// النوافذ النشطة فقط
const activeWindows = await window.api.getActiveWindows()

// إنشاء نافذة جديدة
const window = await window.api.createWindow(true)
```

### 👥 Employees Management
```typescript
// الحصول على جميع الموظفين
const employees = await window.api.getEmployees()

// إنشاء جلسة موظف
const session = await window.api.createEmployeeWindow('W001', 'DEVICE123', 1)

// تخصيص خدمة لموظف
const result = await window.api.assignServiceToEmployee('W001', serviceId)
```

### 🖥️ Devices Management
```typescript
// الحصول على جميع الأجهزة
const devices = await window.api.getDevices()

// تسجيل جهاز جديد
const device = await window.api.registerDevice({
  device_id: 'UNIQUE_ID',
  type: 'customer_screen',
  name: 'شاشة العملاء - الرئيسية'
})

// الأجهزة المتصلة فقط
const onlineDevices = await window.api.getOnlineDevices()
```

### 🔌 Socket.IO Real-time
```typescript
// الاتصال بـ Socket.IO
const result = await window.api.connectSocket('http://localhost:3001', deviceInfo)

// الاستماع للأحداث المباشرة
const removeListener = window.api.onSocketEvent('ticket-created', (data) => {
  console.log('تذكرة جديدة:', data)
})

// إرسال حدث
await window.api.socketEmit('custom-event', { message: 'Hello' })

// إزالة المستمع
removeListener()
```

### 🖨️ Printing
```typescript
// الحصول على الطابعات المحلية
const printers = await window.api.getLocalPrinters()

// طباعة تذكرة
const result = await window.api.printTicket(ticketData, printerName)

// طباعة ذكية (تختار أفضل طابعة)
const result = await window.api.smartPrintTicket(ticketData, preferences)
```

### 🔊 Audio Announcements
```typescript
// تشغيل إعلان صوتي
await window.api.audioPlayAnnouncement('T001', 'النافذة الأولى')

// تفعيل/إلغاء الصوت
await window.api.audioSetEnabled(true)

// اختبار النظام الصوتي
await window.api.audioTest()
```

## 🧪 شاشة الاختبار

للوصول إلى شاشة الاختبار الشاملة:
```
http://localhost:5173/?screen=test
```

الشاشة تتضمن:
- ✅ اختبار اكتشاف الشبكة
- ✅ اختبار الاتصال بالخادم
- ✅ اختبار Socket.IO
- ✅ اختبار جميع APIs
- ✅ إنشاء تذاكر تجريبية
- ✅ مراقبة الأحداث المباشرة
- ✅ عرض اللوجز المباشرة

## 📱 أمثلة عملية للاستخدام

### مثال 1: إنشاء شاشة عملاء جديدة
```typescript
import React, { useState, useEffect } from 'react'

export const NewCustomerScreen = () => {
  const [services, setServices] = useState([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    // تحميل الخدمات
    loadServices()

    // الاستماع للتحديثات المباشرة
    const removeListener = window.api.onSocketEvent('queue-updated', (data) => {
      // تحديث العرض عند تغيير الطابور
      console.log('Queue updated:', data)
    })

    return () => removeListener()
  }, [])

  const loadServices = async () => {
    const result = await window.api.getServices()
    setServices(result.data || [])
  }

  const createTicket = async (serviceId: number) => {
    setIsCreating(true)
    try {
      const result = await window.api.createTicket(serviceId)
      if (result.success) {
        // إظهار التذكرة للعميل
        console.log('Ticket created:', result.data)
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-6">
      <h1>اختر الخدمة</h1>
      <div className="grid grid-cols-2 gap-4 mt-6">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => createTicket(service.id)}
            disabled={isCreating}
            className="p-4 bg-blue-600 text-white rounded-lg"
          >
            {service.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### مثال 2: شاشة موظف للاستدعاء
```typescript
export const EmployeeCallScreen = () => {
  const [currentTicket, setCurrentTicket] = useState(null)
  const [windowNumber, setWindowNumber] = useState('W001')

  const callNextTicket = async () => {
    try {
      const result = await window.api.callNextTicket(windowNumber)
      if (result.success) {
        setCurrentTicket(result.data)

        // تشغيل الإعلان الصوتي
        await window.api.audioPlayAnnouncement(
          result.data.ticket_number,
          windowNumber
        )
      }
    } catch (error) {
      console.error('Error calling ticket:', error)
    }
  }

  const serveCurrentTicket = async () => {
    if (!currentTicket) return

    try {
      await window.api.serveTicket(currentTicket.id, windowNumber)
      setCurrentTicket(null)
    } catch (error) {
      console.error('Error serving ticket:', error)
    }
  }

  return (
    <div className="p-6">
      <h1>نافذة الخدمة {windowNumber}</h1>

      {currentTicket ? (
        <div className="mt-6 p-4 bg-green-100 rounded-lg">
          <h2>التذكرة الحالية: {currentTicket.ticket_number}</h2>
          <button
            onClick={serveCurrentTicket}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded"
          >
            إنهاء الخدمة
          </button>
        </div>
      ) : (
        <button
          onClick={callNextTicket}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          استدعاء التذكرة التالية
        </button>
      )}
    </div>
  )
}
```

## 🔧 تشغيل النظام

1. **تشغيل الخادم:**
```bash
npm run dev:server
```

2. **تشغيل التطبيق:**
```bash
npm run dev
```

3. **الوصول للشاشات:**
- `?screen=customer` - شاشة العملاء
- `?screen=display` - شاشة العرض
- `?screen=window` - شاشة الموظف
- `?screen=admin` - شاشة الإدارة
- `?screen=test` - شاشة الاختبار

## 📊 مراقبة النظام

جميع الوظائف تدعم:
- ✅ معالجة الأخطاء التلقائية
- ✅ إعادة الاتصال التلقائي لـ Socket.IO
- ✅ تسجيل مفصل للأحداث
- ✅ استجابة للتحديثات المباشرة
- ✅ دعم TypeScript الكامل

## 🎯 الخطوات التالية

النظام الآن جاهز تماماً لـ:
1. تطوير شاشات جديدة بسهولة
2. إضافة المزيد من الوظائف حسب الحاجة
3. تخصيص الواجهات لمتطلبات محددة
4. نشر النظام في الإنتاج

جميع الوظائف مُختبرة ومُوثقة وجاهزة للاستخدام! 🚀
