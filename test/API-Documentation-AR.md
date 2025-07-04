# شرح نقاط النهاية والتحكمات - CASNOS API Documentation

## نتائج الاختبار - Test Results Summary

### ✅ نقاط النهاية العاملة - Working Endpoints
- **GET /api/services** - الحصول على جميع الخدمات
- **POST /api/services** - إنشاء خدمة جديدة
- **GET /api/tickets** - الحصول على جميع التذاكر
- **GET /api/tickets/pending** - الحصول على التذاكر المعلقة
- **GET /api/devices** - الحصول على جميع الأجهزة
- **POST /api/devices** - إنشاء جهاز جديد
- **GET /api/employees** - الحصول على جميع الموظفين

### ❌ نقاط النهاية المفقودة - Missing Endpoints
- **GET /api/windows** - إدارة النوافذ مفقودة
- **POST /api/windows** - إنشاء نافذة مفقود
- **POST /api/employees** - إنشاء موظف مفقود
- **GET /api/daily-reset/status** - حالة إعادة التعيين اليومية مفقودة

---

## 🎯 تفاصيل التحكمات - Controller Det
ails

### 1. خدمات النظام - Services Controller

#### الوظائف المتاحة:
```javascript
// GET /api/services - الحصول على جميع الخدمات
{
  "success": true,
  "count": 0,
  "data": []
}

// POST /api/services - إنشاء خدمة جديدة
{
  "name": "خدمة اختبار",
  "description": "وصف الخدمة",
  "number_start": 1,
  "number_end": 100,
  "counter_start": 1,
  "counter_end": 5,
  "active": true
}
```

#### المسار: `src/server/controllers/serviceController.ts`
#### الوظائف:
- **getAllServices()** - جلب جميع الخدمات
- **createService()** - إنشاء خدمة جديدة
- **updateService()** - تحديث خدمة موجودة
- **deleteService()** - حذف خدمة

---

### 2. التذاكر - Tickets Controller

#### الوظائف المتاحة:
```javascript
// GET /api/tickets - جميع التذاكر
{
  "success": true,
  "count": 0,
  "data": []
}

// GET /api/tickets/pending - التذاكر المعلقة
{
  "success": true,
  "data": []
}

// POST /api/tickets - إنشاء تذكرة جديدة
{
  "service_id": 1,
  "device_id": "DEVICE_001",
  "notes": "ملاحظات إضافية"
}
```

#### المسار: `src/server/controllers/ticketController.ts`
#### الوظائف:
- **getAllTickets()** - جميع التذاكر
- **getPendingTickets()** - التذاكر المعلقة
- **createTicket()** - إنشاء تذكرة جديدة
- **callTicket()** - استدعاء تذكرة
- **completeTicket()** - إكمال تذكرة
- **getTicketsByService()** - تذاكر حسب الخدمة

---

### 3. الأجهزة - Devices Controller

#### الوظائف المتاحة:
```javascript
// GET /api/devices - جميع الأجهزة
{
  "success": true,
  "count": 0,
  "data": []
}

// POST /api/devices - إنشاء جهاز جديد
{
  "device_id": "DEVICE_001",
  "name": "جهاز العميل",
  "ip_address": "192.168.1.100",
  "device_type": "customer", // customer, employee, display, admin
  "capabilities": ["display", "printer"]
}
```

#### المسار: `src/server/controllers/deviceController.ts`
#### الوظائف:
- **getAllDevices()** - جميع الأجهزة
- **createDevice()** - إنشاء جهاز جديد
- **updateDevice()** - تحديث جهاز
- **deleteDevice()** - حذف جهاز
- **getDevicesByType()** - أجهزة حسب النوع
- **updateDeviceStatus()** - تحديث حالة الجهاز

---

### 4. الموظفون - Employees Controller

#### الوظائف المتاحة:
```javascript
// GET /api/employees - جميع الموظفين
{
  "success": true,
  "count": 0,
  "data": []
}

// POST /api/employees - إنشاء موظف جديد (❌ مفقود)
{
  "name": "أحمد محمد",
  "position": "موظف خدمة العملاء",
  "phone": "0501234567",
  "email": "ahmed@company.com",
  "active": true
}
```

#### المسار: `src/server/controllers/employeeController.ts`
#### الوظائف:
- **getAllEmployees()** - جميع الموظفين
- **getActiveEmployees()** - الموظفين النشطين
- **createEmployee()** - إنشاء موظف جديد
- **updateEmployee()** - تحديث موظف
- **deleteEmployee()** - حذف موظف

---

### 5. النوافذ - Windows Controller (❌ مفقود من الخادم)

#### الوظائف المطلوبة:
```javascript
// GET /api/windows - جميع النوافذ
{
  "success": true,
  "count": 0,
  "data": []
}

// POST /api/windows - إنشاء نافذة جديدة
{
  "label": "النافذة الأولى",
  "description": "نافذة خدمة العملاء",
  "active": true
}
```

#### المسار: `src/server/controllers/windowController.ts`
#### الوظائف:
- **getAllWindows()** - جميع النوافذ
- **createWindow()** - إنشاء نافذة جديدة
- **updateWindow()** - تحديث نافذة
- **deleteWindow()** - حذف نافذة
- **assignWindowServices()** - ربط النافذة بالخدمات

---

### 6. إعادة التعيين اليومية - Daily Reset Controller (❌ مفقود من الخادم)

#### الوظائف المطلوبة:
```javascript
// GET /api/daily-reset/status - حالة إعادة التعيين
{
  "success": true,
  "data": {
    "lastReset": "2025-07-03",
    "needsReset": false,
    "enabled": true
  }
}

// POST /api/daily-reset/execute - تنفيذ إعادة التعيين
{
  "force": true
}
```

#### المسار: `src/server/controllers/dailyResetController.ts`
#### الوظائف:
- **getDailyResetStatus()** - حالة إعادة التعيين
- **executeDailyReset()** - تنفيذ إعادة التعيين
- **configureDailyReset()** - تكوين إعادة التعيين

---

## 🔌 أحداث المقابس - Socket.IO Events

### أحداث الأجهزة - Device Events
```javascript
// تسجيل جهاز جديد
socket.emit('device:register', {
  deviceId: 'DEVICE_001',
  deviceType: 'customer',
  name: 'جهاز العميل',
  ip: '192.168.1.100'
});

// نبضة حياة
socket.emit('device:heartbeat', {
  deviceId: 'DEVICE_001',
  status: 'online'
});
```

### أحداث التذاكر - Ticket Events
```javascript
// إنشاء تذكرة
socket.emit('ticket:create', {
  serviceId: 1,
  deviceId: 'DEVICE_001'
});

// استدعاء تذكرة
socket.emit('ticket:call', {
  ticketId: 1,
  windowId: 1
});
```

### أحداث الإدارة - Admin Events
```javascript
// حالة النظام
socket.emit('admin:get-system-status');

// إحصائيات
socket.emit('admin:get-statistics');
```

---

## 🚨 المشاكل المكتشفة - Discovered Issues

### 1. نقاط النهاية المفقودة - Missing Endpoints
```
❌ GET /api/windows - خطأ 404
❌ POST /api/windows - خطأ 404
❌ POST /api/employees - خطأ 404
❌ GET /api/daily-reset/status - خطأ 404
```

### 2. مشاكل التوصيل - Connection Issues
```
❌ TCP Port 3003 - غير متاح
❌ UDP Port 3002 - لا يستقبل رسائل
```

### 3. مشاكل أذونات الإدارة - Admin Permission Issues
```
⚠️ Admin unauthorized: Admin access required
```

### 4. مشاكل تسجيل الأجهزة - Device Registration Issues
```
⚠️ Device not found in database
```

---

## 🛠️ الحلول المقترحة - Recommended Solutions

### 1. إضافة نقاط النهاية المفقودة
```javascript
// في server.ts
app.use('/api/windows', windowRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/daily-reset', dailyResetRoutes);
```

### 2. تفعيل TCP/UDP
```javascript
// إضافة خوادم TCP/UDP في server.ts
const tcpServer = net.createServer();
tcpServer.listen(3003);

const udpServer = dgram.createSocket('udp4');
udpServer.bind(3002);
```

### 3. تحسين أذونات الإدارة
```javascript
// إضافة نظام مصادقة للإدارة
const isAdminDevice = (socket) => {
  return socket.handshake.query.deviceType === 'admin';
};
```

### 4. تحسين تسجيل الأجهزة
```javascript
// إنشاء الجهاز تلقائياً عند التسجيل
if (!existingDevice) {
  await deviceOperations.create(deviceData);
}
```

---

## 📊 ملخص الحالة - Status Summary

### ✅ يعمل بشكل جيد - Working Well
- **API الأساسي** - الخدمات والتذاكر والأجهزة
- **Socket.IO** - الاتصال والأحداث الأساسية
- **قاعدة البيانات** - العمليات الأساسية
- **الشبكة** - الاتصال بالخادم

### ⚠️ يحتاج تحسين - Needs Improvement
- **نقاط النهاية** - إضافة النوافذ وإعادة التعيين
- **أذونات الإدارة** - نظام مصادقة
- **تسجيل الأجهزة** - إنشاء تلقائي
- **TCP/UDP** - تفعيل البروتوكولات

### ❌ يحتاج إصلاح - Needs Fixing
- **مسارات الـ API** - إضافة المسارات المفقودة
- **خوادم الشبكة** - تفعيل TCP/UDP
- **معالجة الأخطاء** - تحسين الاستجابات

---

## 🔧 خطة العمل - Action Plan

### الأولوية العالية - High Priority
1. إضافة مسارات النوافذ والموظفين
2. تفعيل TCP/UDP للأجهزة
3. إصلاح أذونات الإدارة

### الأولوية المتوسطة - Medium Priority
1. تحسين تسجيل الأجهزة
2. إضافة إعادة التعيين اليومية
3. تحسين معالجة الأخطاء

### الأولوية المنخفضة - Low Priority
1. تحسين الوثائق
2. إضافة المزيد من الاختبارات
3. تحسين الأداء

---

**نظام طوابير CASNOS** - نظام إدارة الطوابير المتقدم
