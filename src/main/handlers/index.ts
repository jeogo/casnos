// 🔧 Handlers Index - فهرس المعالجات
// ملف مركزي لتسجيل معالجات IPC المطلوبة فقط حسب نوع الشاشة

import { setupPrintHandlers, updateServerInfo } from './printHandlers';
import { setupNetworkHandlers, updateNetworkServerInfo } from './networkHandlers';
import { setupAudioHandlers } from './audioHandlers';
import { setupWindowHandlers } from './windowHandlers';
import { getDiscoveredServerInfo } from '../services/udpDiscoveryService';
import { getScreenConfig, ScreenConfig } from '../config/screenOptimization';

// 🎯 دالة لتسجيل المعالجات المطلوبة فقط حسب نوع الشاشة
export function registerOptimizedIPCHandlers(screenMode?: string) {
  const config = getScreenConfig(screenMode);

  console.log(`[HANDLERS] 🎯 Starting optimized IPC handlers registration for ${screenMode || 'all'} screen...`);

  // ✅ تسجيل معالجات الشبكة (مطلوبة دائماً)
  if (config.networkHandlers) {
    setupNetworkHandlers();
    console.log('[HANDLERS] 📡 Network handlers registered');
  }

  // 🖨️ تسجيل معالجات الطباعة (حسب الحاجة)
  if (config.printHandlers) {
    setupPrintHandlers();
    console.log('[HANDLERS] 🖨️ Print handlers registered');
  }

  // 🔊 تسجيل معالجات الصوت (للشاشات التي تحتاجها)
  if (config.audioHandlers) {
    setupAudioHandlers();
    console.log('[HANDLERS] 🔊 Audio handlers registered');
  }

  // 🪟 تسجيل معالجات النوافذ (للإدارة فقط)
  if (config.windowHandlers) {
    setupWindowHandlers();
    console.log('[HANDLERS] 🪟 Window handlers registered');
  }

  console.log(`[HANDLERS] ✅ Optimized IPC handlers registered successfully (${getActiveHandlersCount(config)} services loaded)`);
}

// 📊 حساب عدد الخدمات المفعلة
function getActiveHandlersCount(config: ScreenConfig): number {
  let count = 0;
  if (config.networkHandlers) count++;
  if (config.printHandlers) count++;
  if (config.audioHandlers) count++;
  if (config.windowHandlers) count++;
  return count;
}

// 🔄 دالة متوافقة مع النظام القديم (للتطوير)
export function registerAllIPCHandlers() {
  console.log('[HANDLERS] ⚠️ Using legacy all-handlers mode (not optimized)');
  registerOptimizedIPCHandlers('all');
}

// دالة لتحديث معلومات الخادم في جميع المعالجات
export function updateAllHandlersServerInfo(screenMode?: string) {
  const config = getScreenConfig(screenMode);
  const serverInfo = getDiscoveredServerInfo();

  // تحديث معلومات الخادم فقط في المعالجات المفعلة
  if (config.printHandlers) {
    updateServerInfo(serverInfo.ip, serverInfo.port);
  }

  if (config.networkHandlers) {
    updateNetworkServerInfo(serverInfo.ip, serverInfo.port);
  }

  console.log(`[HANDLERS] 🔄 Server info updated in active handlers for ${screenMode || 'all'} screen:`, serverInfo);
}

// دالة لمراقبة حالة الخادم وتحديث المعالجات مع تحسين الأداء
export function startOptimizedServerInfoSync(screenMode?: string) {
  const config = getScreenConfig(screenMode);

  // تحديث فوري
  updateAllHandlersServerInfo(screenMode);

  // تحديث دوري حسب إعدادات الشاشة المحسنة
  setInterval(() => {
    updateAllHandlersServerInfo(screenMode);
  }, config.serverSyncInterval);
}

// 🔄 دالة متوافقة مع النظام القديم
export function startServerInfoSync() {
  startOptimizedServerInfoSync('all');
}
