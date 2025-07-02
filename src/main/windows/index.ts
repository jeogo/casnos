// 📁 Windows Index - فهرس النوافذ
// ملف فهرس لتسهيل استيراد جميع وحدات النوافذ

// تصدير جميع وحدات النوافذ الفردية
export * from './customerWindow'
export * from './displayWindow'
export * from './employeeWindow'
export * from './adminWindow'

// تصدير مدير النوافذ
export * from './windowManager'

// تصدير الأنواع
export type { WindowType } from './windowManager'
