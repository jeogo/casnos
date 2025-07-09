import { DeviceInfo } from '../hooks/useServerConnection'

/**
 * Get real device information for registration
 * Uses actual system info instead of hardcoded values
 */
export const getDeviceInfo = async (deviceType: 'customer' | 'display' | 'window' | 'admin'): Promise<DeviceInfo> => {
  try {
    // Get real IP address from local network detection
    const deviceNetworkInfo = await window.api.getDeviceNetworkInfo()
    const localIP = deviceNetworkInfo?.ipAddress || '127.0.0.1'

    // Generate consistent device ID based on device type and machine
    const machineInfo = await window.api.getMachineId()
    const deviceId = `${deviceType.toUpperCase()}_${machineInfo.machineId}`

    // Create device name
    const deviceName = `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Terminal`

    const deviceInfo: DeviceInfo = {
      device_id: deviceId,
      name: deviceName,
      device_type: deviceType,
      ip_address: localIP
    }

    console.log('[DEVICE-INFO] 📱 Generated device info:', deviceInfo)
    return deviceInfo

  } catch (error) {
    console.error('[DEVICE-INFO] ❌ Error getting device info:', error)

    // Fallback to basic info if system calls fail
    const fallbackId = `${deviceType.toUpperCase()}_${Date.now()}`
    return {
      device_id: fallbackId,
      name: `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Terminal`,
      device_type: deviceType,
      ip_address: '127.0.0.1'
    }
  }
}

/**
 * Validate device info before registration
 */
export const validateDeviceInfo = (deviceInfo: DeviceInfo): boolean => {
  if (!deviceInfo.device_id || !deviceInfo.name || !deviceInfo.device_type) {
    console.error('[DEVICE-INFO] ❌ Missing required fields:', deviceInfo)
    return false
  }

  if (!deviceInfo.ip_address) {
    console.error('[DEVICE-INFO] ❌ Missing IP address:', deviceInfo)
    return false
  }

  return true
}
