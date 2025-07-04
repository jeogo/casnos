// 🔍 Device Information Utility - Simple & Robust Device Registration Helper
// يساعد في الحصول على معلومات الجهاز تلقائياً لتسجيل الأجهزة

export interface DeviceInfo {
  device_id: string
  name: string
  ip_address: string
  device_type: 'display' | 'customer' | 'window'
  mac_address?: string
}

/**
 * مفاتيح التخزين المحلي لمعرفات الأجهزة
 * Local storage keys for device identifiers
 */
export const DEVICE_STORAGE_KEYS = {
  DISPLAY: 'display-device-id',
  CUSTOMER: 'customer-device-id',
  WINDOW: 'device-unique-id' // Keep existing key for compatibility
} as const;

/**
 * الأسماء العربية والإنجليزية للأجهزة
 * Arabic and English names for devices
 */
export const DEVICE_NAMES = {
  display: 'شاشة العرض',
  customer: 'شاشة العملاء',
  window: 'شباك النافذة'
} as const;

/**
 * معرفات الأجهزة الثابتة البسيطة
 * Simple fixed device IDs
 */
export const DEVICE_IDS = {
  display: 'display-casnos-001',
  customer: 'customer-casnos-001',
  window: (windowNumber: string) => `window-casnos-${windowNumber.toLowerCase().replace(/\s+/g, '-')}`
} as const;

/**
 * الحصول على عنوان IP الجهاز تلقائياً - IPv4 ONLY
 * Get device IP address automatically - IPv4 ONLY
 */
export async function getDeviceIP(): Promise<string> {
  try {
    // Try to get network info from Electron main process
    const networkInfo = await (window.api as any).getDeviceNetworkInfo();
    if (networkInfo && networkInfo.ipAddress &&
        networkInfo.ipAddress !== '127.0.0.1' &&
        networkInfo.ipAddress !== 'localhost' &&
        networkInfo.ipAddress !== '::1') {
      return networkInfo.ipAddress;
    }

    // Try to get real IP from server info
    const serverInfo = await (window.api as any).getServerInfo();
    if (serverInfo && serverInfo.clientIP &&
        serverInfo.clientIP !== '127.0.0.1' &&
        serverInfo.clientIP !== 'localhost' &&
        serverInfo.clientIP !== '::1') {
      return serverInfo.clientIP;
    }

    // Check window location hostname (but never localhost)
    const hostname = window.location.hostname;
    if (hostname &&
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        hostname !== '::1' &&
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) {
      return hostname;
    }

    // Must return a valid network IP - never localhost or default fallback
    throw new Error('Cannot determine device IP address - no valid network IP found');
  } catch (err) {
    console.error('[DEVICE-INFO] Could not determine IP address:', err);
    throw new Error('Cannot determine device IP address - no valid network IP found');
  }
}

/**
 * الحصول على عنوان MAC address إذا كان متاحاً
 * Get MAC address if available
 */
export async function getMACAddress(): Promise<string | null> {
  try {
    // Get MAC address from Electron main process
    const macAddress = await (window.api as any).getMacAddress();
    return macAddress;
  } catch (err) {
    console.warn('[DEVICE-INFO] Could not determine MAC address');
    return null;
  }
}

/**
 * إنشاء معرف جهاز فريد
 * Create unique device ID with localStorage persistence
 */
export function createDeviceId(deviceType: string, macAddress?: string, storageKey?: string): string {
  // Check if we have a stored device ID first
  if (storageKey) {
    const storedId = localStorage.getItem(storageKey);
    if (storedId) {
      return storedId;
    }
  }

  let deviceId: string;

  if (macAddress) {
    // Use MAC address for truly unique ID
    const cleanMac = macAddress.replace(/[:-]/g, '').toLowerCase();
    deviceId = `${deviceType}-${cleanMac}`;
  } else {
    // Fallback to simple naming convention with timestamp for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    deviceId = `${deviceType}-casnos-${timestamp}-${random}`;
  }

  // Store the generated ID if storage key is provided
  if (storageKey) {
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * الحصول على معلومات كاملة للجهاز
 * Get complete device information for registration
 */
export async function getDeviceInfo(
  deviceType: 'display' | 'customer' | 'window',
  deviceName: string,
  customDeviceId?: string
): Promise<DeviceInfo> {
  try {
    const ip_address = await getDeviceIP();
    const mac_address = await getMACAddress();

    const device_id = customDeviceId || createDeviceId(deviceType, mac_address || undefined);

    return {
      device_id,
      name: deviceName,
      ip_address,
      device_type: deviceType,
      ...(mac_address && { mac_address })
    };
  } catch (error) {
    console.error('[DEVICE-INFO] Error getting device info:', error);

    // No fallback IP - must have real network IP
    throw new Error('Cannot create device info without valid network IP address');
  }
}

/**
 * التحقق من صحة معلومات الجهاز
 * Validate device info before registration
 */
export function validateDeviceInfo(deviceInfo: DeviceInfo): boolean {
  return !!(
    deviceInfo.device_id &&
    deviceInfo.name &&
    deviceInfo.ip_address &&
    deviceInfo.device_type &&
    ['display', 'customer', 'window'].includes(deviceInfo.device_type)
  );
}

/**
 * الحصول على معرف جهاز ثابت ومُحفوظ (للتوافق مع الإصدارات السابقة)
 * Get persistent device ID from localStorage or create new one (backward compatibility)
 */
export async function getPersistentDeviceId(
  deviceType: 'display' | 'customer' | 'window'
): Promise<string> {
  const storageKey = (() => {
    switch (deviceType) {
      case 'display': return DEVICE_STORAGE_KEYS.DISPLAY;
      case 'customer': return DEVICE_STORAGE_KEYS.CUSTOMER;
      case 'window': return DEVICE_STORAGE_KEYS.WINDOW;
      default: return 'device-id';
    }
  })();

  // Check if we already have a stored device ID
  const storedId = localStorage.getItem(storageKey);
  if (storedId) {
    return storedId;
  }

  // Generate new persistent device ID
  try {
    const macAddress = await getMACAddress();
    const deviceId = createDeviceId(deviceType, macAddress || undefined, storageKey);
    return deviceId;
  } catch (error) {
    const fallbackId = createDeviceId(deviceType, undefined, storageKey);
    return fallbackId;
  }
}
