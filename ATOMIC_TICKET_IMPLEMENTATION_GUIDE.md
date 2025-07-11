# دليل تطبيق منطق الطباعة الذري
## Atomic Ticket Printing Implementation Guide

### 🎯 الهدف
تطبيق منطق "لا طباعة، لا تذكرة" في نظام CASNOS بشكل موثوق وآمن.

### 📋 ملخص التطبيق

#### ✅ تم إنشاؤه:
1. **AtomicTicketPrintManager**: مدير الطباعة الذري الجديد
2. **ATOMIC_TICKET_PRINT_PLAN.md**: خطة التطبيق المفصلة
3. **منطق الطباعة أولاً**: الطباعة تحدث قبل إنشاء التذكرة

#### 🔄 التدفق الجديد:
```
1. إنشاء بيانات تذكرة مؤقتة
2. إنشاء PDF مؤقت
3. محاولة الطباعة
4. إنشاء التذكرة في قاعدة البيانات (فقط عند نجاح الطباعة)
5. تنظيف الملفات المؤقتة
```

### 🛠️ طريقة الاستخدام

#### 1. في CustomerScreen:
```typescript
// استبدال الكود الحالي
import { AtomicTicketPrintManager } from '../main/printing/atomicTicketPrintManager'

const atomicManager = AtomicTicketPrintManager.getInstance()

// بدلاً من:
// const ticket = await createTicket(serviceId, serviceName, printType)
// await window.api.printTicket(ticketData, printerName)

// استخدم:
const result = await atomicManager.createLocalTicketWithAtomicPrint(
  serviceId,
  selectedPrinter.name
)

if (result.success) {
  console.log('✅ تم إنشاء وطباعة التذكرة:', result.ticket.ticket_number)
  // عرض التذكرة للمستخدم
} else {
  console.error('❌ فشل في الطباعة:', result.error)
  // عرض رسالة خطأ للمستخدم
}
```

#### 2. في DisplayScreen:
```typescript
// للطباعة الشبكية
const result = await atomicManager.createNetworkTicketWithAtomicPrint(
  serviceId,
  networkPrinterName
)

if (result.success) {
  console.log('✅ تم إنشاء وطباعة التذكرة عبر الشبكة:', result.ticket.ticket_number)
} else {
  console.error('❌ فشل في الطباعة الشبكية:', result.error)
}
```

### 🔧 التكامل مع النظام الحالي

#### 1. إضافة IPC Handler:
```typescript
// في main/handlers/printHandlers.ts
ipcMain.handle('create-atomic-ticket', async (_event, serviceId, printerName, printType) => {
  try {
    const atomicManager = AtomicTicketPrintManager.getInstance()

    if (printType === 'local') {
      return await atomicManager.createLocalTicketWithAtomicPrint(serviceId, printerName)
    } else {
      return await atomicManager.createNetworkTicketWithAtomicPrint(serviceId, printerName)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
```

#### 2. تحديث API:
```typescript
// في preload/index.ts
createAtomicTicket: (serviceId: number, printerName: string, printType: 'local' | 'network') =>
  ipcRenderer.invoke('create-atomic-ticket', serviceId, printerName, printType)
```

### 📊 مراقبة الأداء

#### إحصائيات الطباعة الذرية:
```typescript
// الحصول على إحصائيات النظام
const stats = atomicManager.getAtomicPrintStats()
console.log('📊 إحصائيات الطباعة الذرية:', stats)

// تنظيف الملفات المؤقتة
await atomicManager.cleanupAllTempFiles()
```

### 🔍 مثال كامل للتطبيق

#### في CustomerScreen/index.tsx:
```typescript
const handleCreateAndPrintTicket = async () => {
  if (!selectedService || !selectedPrinter) return

  setIsCreating(true)
  setError(null)

  try {
    // استخدام المدير الذري
    const atomicManager = AtomicTicketPrintManager.getInstance()

    const result = await atomicManager.createLocalTicketWithAtomicPrint(
      selectedService.id,
      selectedPrinter.name
    )

    if (result.success) {
      // نجح إنشاء وطباعة التذكرة
      setCurrentTicket(result.ticket)
      setCreationSuccess(true)

      // عرض رسالة نجاح
      toast.success(`✅ تم إنشاء وطباعة التذكرة رقم ${result.ticket.ticket_number}`)

      // تسجيل الإحصائيات
      console.log(`📊 وقت الطباعة: ${result.printDuration}ms`)

    } else {
      // فشل في الطباعة - لم يتم إنشاء تذكرة
      setError(result.error || 'فشل في الطباعة')
      toast.error(`❌ ${result.error}`)
    }

  } catch (error) {
    setError('حدث خطأ في النظام')
    toast.error('حدث خطأ غير متوقع')
    console.error('خطأ في النظام الذري:', error)
  } finally {
    setIsCreating(false)
  }
}
```

### 🛡️ معالجة الأخطاء

#### أنواع الأخطاء المحتملة:
1. **خطأ في إنشاء PDF**: `PDF generation failed`
2. **خطأ في الطباعة**: `Print failed: [تفاصيل الخطأ]`
3. **خطأ في قاعدة البيانات**: `Database error: [تفاصيل الخطأ]`
4. **خطأ في النظام**: `System error: [تفاصيل الخطأ]`

#### معالجة الأخطاء:
```typescript
if (!result.success) {
  switch (result.error) {
    case 'PDF generation failed':
      // معالجة خطأ إنشاء PDF
      showError('فشل في إنشاء ملف PDF')
      break
    case 'Print failed':
      // معالجة خطأ الطباعة
      showError('فشل في الطباعة - تأكد من حالة الطابعة')
      break
    default:
      // معالجة الأخطاء العامة
      showError('حدث خطأ غير متوقع')
  }
}
```

### 🧪 اختبار النظام

#### اختبارات مطلوبة:
1. **اختبار الطباعة المحلية الناجحة**
2. **اختبار فشل الطباعة المحلية**
3. **اختبار الطباعة الشبكية الناجحة**
4. **اختبار فشل الطباعة الشبكية**
5. **اختبار انقطاع الطابعة**
6. **اختبار تنظيف الملفات المؤقتة**

### 🔄 خطة التطبيق التدريجي

#### المرحلة 1: الاختبار الأولي
- تطبيق النظام الذري بشكل تجريبي
- اختبار الوظائف الأساسية
- التأكد من عدم وجود تأثيرات جانبية

#### المرحلة 2: التطبيق الجزئي
- استبدال الطباعة المحلية في CustomerScreen
- الاحتفاظ بالنظام القديم للطباعة الشبكية

#### المرحلة 3: التطبيق الكامل
- استبدال جميع أنواع الطباعة
- إزالة الكود القديم
- تحسين الأداء

### 📈 المؤشرات المطلوبة

#### مؤشرات النجاح:
- **معدل نجاح الطباعة الذرية**: > 95%
- **متوسط وقت الطباعة**: < 5 ثوان
- **عدد التذاكر اليتيمة**: = 0
- **استقرار النظام**: عدم حدوث أخطاء نظامية

#### مؤشرات المراقبة:
- عدد محاولات الطباعة
- عدد الطباعات الناجحة
- عدد الطباعات الفاشلة
- أوقات الاستجابة
- استخدام الذاكرة

### 🎯 الخلاصة

تطبيق منطق الطباعة الذري سيضمن:
- **موثوقية عالية**: كل تذكرة مُنشأة = تذكرة مطبوعة
- **أداء محسن**: تقليل العمليات المعلقة
- **سهولة الصيانة**: منطق واضح وموحد
- **مراقبة دقيقة**: تتبع شامل للعمليات

هذا النظام يحل مشكلة "التذاكر بدون طباعة" بشكل نهائي ويحسن من جودة وموثوقية نظام إدارة الطوابير.
