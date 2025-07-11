# 🔍 تشخيص مشكلة الطباعة الشبكية - خطة العمل التفصيلية

## 📋 التحليل الفني للمشكلة

### 🔄 تدفق الطباعة الشبكية الحالي:
1. **إنشاء التذكرة** في CustomerScreen → `print_status: 'pending'`
2. **إرسال إشعار** عبر Socket.IO → `print:pending-instant`
3. **استقبال في DisplayScreen** → معالج `onEvent('print:pending-instant')`
4. **الطباعة الفورية** → `window.api.printTicket()`
5. **تحديث الحالة** → `updatePrintStatus('printed')`

### 🚨 النقاط الحرجة المحتملة:

#### 1. **انقطاع الاتصال**
```typescript
if (!isConnected) return; // ⚠️ إذا انقطع الاتصال، تتوقف الطباعة
```

#### 2. **فشل استعلام قاعدة البيانات**
```typescript
const serviceResponse = await window.api.getServiceById(ticket.service_id);
// ⚠️ إذا فشل هذا الاستعلام، قد تتوقف الطباعة
```

#### 3. **مشاكل PDF/Chromium**
```typescript
await window.api.printTicket() // ⚠️ قد يفشل في توليد PDF
```

#### 4. **تضارب الأحداث**
```typescript
// أحداث متعددة قد تتداخل
'print:pending-instant' // فوري
'queue:updated' // تحديث الطابور
checkPendingTicketsInstantly() // نظام احتياطي
```

## 🛠️ خطة التشخيص والحل

### 🔍 المرحلة الأولى: التشخيص الفوري (5 دقائق)

#### 1. **فحص الملفات والسجلات**
```bash
# تحقق من وجود ملف المراقبة
ls -la ./data/production-monitor.txt
# اعرض آخر 50 سطر
tail -n 50 ./data/production-monitor.txt
```

#### 2. **فحص حالة الخادم**
```bash
# تحقق من port 3001
netstat -an | find "3001"
# أو
telnet localhost 3001
```

#### 3. **فحص الطابعة الافتراضية**
```bash
# في PowerShell
Get-Printer | Where-Object {$_.IsDefault -eq $True}
```

#### 4. **فحص ملفات PDF المؤقتة**
```bash
# تحقق من مجلد البيانات
ls -la ./data/pdf/
ls -la ./data/temp/
```

### 🔬 المرحلة الثانية: الاختبار التفصيلي (15 دقيقة)

#### 1. **اختبار الطباعة المحلية**
- افتح CustomerScreen
- اختر طابعة محلية
- أنشئ تذكرة واحدة
- راقب النتيجة

#### 2. **اختبار الطباعة الشبكية**
- افتح DisplayScreen
- اضغط F12 للـ Developer Tools
- اذهب إلى Console
- أنشئ تذكرة شبكية من CustomerScreen
- راقب الرسائل في الكونسول

#### 3. **فحص Socket.IO**
- في Developer Tools → Network
- ابحث عن "socket.io"
- راقب الأحداث الواردة والصادرة

#### 4. **اختبار API**
```bash
# اختبار API مباشرة
curl http://localhost:3001/api/tickets/pending
curl http://localhost:3001/api/services
```

### 🔧 المرحلة الثالثة: إعدادات النظام (10 دقائق)

#### 1. **فحص خدمة الطباعة**
```bash
# في PowerShell كمسؤول
Get-Service -Name "Spooler"
# إذا كانت متوقفة
Start-Service -Name "Spooler"
```

#### 2. **فحص Firewall**
```bash
# تحقق من Windows Firewall
netsh advfirewall show allprofiles
# أو أضف استثناء للبورت
netsh advfirewall firewall add rule name="CASNOS" dir=in action=allow protocol=TCP localport=3001
```

#### 3. **فحص User Permissions**
```bash
# تحقق من صلاحيات الكتابة
icacls ./data/
```

### 🚀 المرحلة الرابعة: الحلول السريعة (5 دقائق)

#### 1. **إعادة تشغيل الخدمات**
```bash
# في PowerShell كمسؤول
Stop-Service -Name "Spooler"
Start-Service -Name "Spooler"
```

#### 2. **تنظيف البيانات المؤقتة**
```bash
# حذف الملفات المؤقتة
rm -rf ./data/temp/*
rm -rf ./data/pdf/*
```

#### 3. **إعادة تشغيل التطبيق**
```bash
# إغلاق التطبيق
taskkill /F /IM "CASNOS.exe"
# أو استخدام Task Manager
```

## 🎯 السيناريوهات المحتملة والحلول

### 🟢 **السيناريو الأول: DisplayScreen غير متصل**
**الأعراض:**
- رسالة "غير متصل" في واجهة DisplayScreen
- عدم تحديث البيانات

**الحل:**
1. تحقق من IP الخادم في إعدادات DisplayScreen
2. تأكد من تشغيل الخادم على port 3001
3. أعد تشغيل DisplayScreen

### 🟡 **السيناريو الثاني: PDF لا يتم توليده**
**الأعراض:**
- رسائل "PDF generation failed" في الكونسول
- وجود أخطاء في production-monitor.txt

**الحل:**
1. تحقق من مجلد resources/assets/
2. تأكد من وجود SumatraPDF.exe
3. فحص صلاحيات الكتابة في مجلد data/

### 🔴 **السيناريو الثالث: الطابعة لا تطبع**
**الأعراض:**
- PDF يتم توليده بنجاح
- عدم خروج التذكرة من الطابعة

**الحل:**
1. تحقق من تشغيل خدمة Print Spooler
2. تأكد من وجود طابعة افتراضية
3. اختبر الطباعة يدوياً من Windows

### 🟣 **السيناريو الرابع: تضارب الأحداث**
**الأعراض:**
- طباعة مضاعفة للتذكرة
- رسائل "DUPLICATE PREVENTED" في الكونسول

**الحل:**
1. أعد تشغيل DisplayScreen
2. تحقق من عدم تشغيل أكثر من DisplayScreen
3. امسح البيانات المؤقتة

## 📊 جدولة التشخيص

### ⏰ **الدقائق الأولى 5: التشخيص السريع**
- [ ] فحص اتصال الخادم
- [ ] فحص حالة DisplayScreen
- [ ] فحص production-monitor.txt
- [ ] فحص الطابعة الافتراضية

### ⏰ **الدقائق 5-20: الاختبار التفصيلي**
- [ ] اختبار تذكرة محلية
- [ ] اختبار تذكرة شبكية
- [ ] فحص Developer Tools
- [ ] فحص Socket.IO

### ⏰ **الدقائق 20-30: إعدادات النظام**
- [ ] فحص خدمة Print Spooler
- [ ] فحص Firewall
- [ ] فحص User Permissions
- [ ] فحص مجلد الموارد

### ⏰ **الدقائق 30-35: الحلول السريعة**
- [ ] إعادة تشغيل الخدمات
- [ ] تنظيف البيانات المؤقتة
- [ ] إعادة تشغيل التطبيق

## 🎖️ معايير النجاح

### ✅ **علامات النجاح:**
- DisplayScreen متصل ويعرض "متصل"
- رسائل "✅ PDF generated successfully" في الكونسول
- رسائل "🖨️ Print completed" في الكونسول
- التذكرة تخرج من الطابعة
- حالة التذكرة تتحدث إلى "printed"

### ❌ **علامات الفشل:**
- رسائل "❌ PDF generation failed"
- رسائل "PRINT_FAILED"
- عدم تحديث حالة التذكرة
- عدم خروج التذكرة من الطابعة

## 💡 نصائح للتشخيص الفعال

### 🔍 **للتشخيص الدقيق:**
1. **اختبر خطوة واحدة في كل مرة**
2. **استخدم Developer Tools دائماً**
3. **راقب ملف production-monitor.txt**
4. **احتفظ بسجل لكل تغيير**

### 🛠️ **للحلول السريعة:**
1. **ابدأ بالحلول البسيطة**
2. **أعد تشغيل الخدمات أولاً**
3. **نظّف البيانات المؤقتة**
4. **تأكد من البيئة قبل الاختبار**

### 📞 **للحصول على المساعدة:**
1. **اجمع كل رسائل الخطأ**
2. **صوّر شاشة Developer Tools**
3. **احفظ محتويات production-monitor.txt**
4. **اكتب خطوات إعادة الإنتاج**

## 🚀 خطة العمل الموصى بها

### 👨‍💻 **للمطور:**
1. شغّل النظام في بيئة التطوير
2. افتح Developer Tools في DisplayScreen
3. أنشئ تذكرة شبكية واحدة
4. راقب الأحداث والرسائل
5. اتبع خطوات التشخيص بالترتيب

### 🏭 **للإنتاج:**
1. تأكد من بيئة الإنتاج مستقرة
2. اختبر مع تذكرة واحدة أولاً
3. راقب الأداء والاستقرار
4. احتفظ بسجل للحوادث
5. خطط لنسخ احتياطية

هذه الخطة شاملة لتشخيص وحل مشكلة الطباعة الشبكية في نظام CASNOS. اتبع الخطوات بالترتيب واستخدم الأدوات المناسبة للتشخيص الفعال.
