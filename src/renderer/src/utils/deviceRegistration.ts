// 📋 Simple Device Registration System
// نظام تسجيل الأجهزة البسيط والقوي

import { DeviceInfo, validateDeviceInfo } from './deviceInfo';
import appServices from './appServices';

export interface RegistrationResult {
  success: boolean;
  device?: any;
  message?: string;
  alreadyRegistered?: boolean;
}

/**
 * تسجيل الجهاز بشكل بسيط وآمن
 * Register device simply and safely
 */
export async function registerDevice(deviceInfo: DeviceInfo): Promise<RegistrationResult> {
  try {
    // Attempting to register device

    // Check if server is connected
    if (!appServices.isServerDiscovered()) {
      // Server not discovered, attempting discovery
      const discoverySuccess = await appServices.initializeWithDiscovery();
      if (!discoverySuccess) {
        throw new Error('Cannot register device: Server not found');
      }
    }


    // Validate device info first
    if (!validateDeviceInfo(deviceInfo)) {
      return {
        success: false,
        message: 'Invalid device information'
      };
    }

    // Attempt registration - server handles duplicates automatically
    const registrationResult = await appServices.registerDevice(deviceInfo);

    if (registrationResult && registrationResult.success) {

      return {
        success: true,
        device: registrationResult.data,
        message: registrationResult.message,
        alreadyRegistered: registrationResult.message?.includes('already existed')
      };
    } else {
      return {
        success: false,
        message: registrationResult?.message || 'Registration failed'
      };
    }

  } catch (error) {

    // Don't fail completely - the app should continue working
    return {
      success: false,
      message: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * التحقق من حالة تسجيل الجهاز
 * Check device registration status (optional, for advanced use)
 */
export async function checkDeviceRegistration(_deviceId: string): Promise<boolean> {
  try {
    // This would require a new API endpoint to check if device exists
    // For now, we rely on the server's built-in duplicate handling
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * تسجيل تلقائي مع إعادة المحاولة
 * Auto-register with retry logic
 */
export async function autoRegisterDevice(
  deviceInfo: DeviceInfo,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<RegistrationResult> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Registration attempt
      const result = await registerDevice(deviceInfo);

      if (result.success) {
        // Device registered successfully
        return result;
      }

      lastError = result.message;

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

    } catch (error) {
      lastError = error;

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }


  return {
    success: false,
    message: `Registration failed after ${maxRetries} attempts: ${lastError}`
  };
}
