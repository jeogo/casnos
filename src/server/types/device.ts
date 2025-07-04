// Device and Printer Management Types

export type DeviceType = 'display' | 'customer' | 'window' | 'admin'
export type DeviceStatus = 'online' | 'offline' | 'error'

export interface Device {
  device_id: string
  name: string
  ip_address: string
  device_type: DeviceType
  status?: DeviceStatus
}

export interface DevicePrinter {
  id: number
  device_id: string // Foreign key to devices.device_id
  printer_id: string // Unique printer identifier
  printer_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// For creating a new device
export interface DatabaseDevice {
  device_id: string
  name: string
  ip_address: string
  device_type: DeviceType
  status?: DeviceStatus
  created_at?: string
  updated_at?: string
}

// Full device with all properties
export interface DeviceRecord extends DatabaseDevice {
  id: number
  created_at: string
  updated_at: string
}

export interface DatabaseDevicePrinter {
  device_id: string
  printer_id: string
  printer_name: string
  is_default?: boolean
}

// Request types for API
export interface CreateDeviceRequest {
  device_id: string
  name: string
  ip_address: string
  port?: number
  device_type: 'display' | 'customer' | 'window'
  capabilities?: object
  metadata?: object
}

export interface UpdateDeviceRequest {
  name?: string
  ip_address?: string
  port?: number
  device_type?: 'display' | 'customer' | 'window'
  status?: 'online' | 'offline' | 'error'
  capabilities?: object
  metadata?: object
}

export interface CreateDevicePrinterRequest {
  printer_id: string
  printer_name: string
  is_default?: boolean
}

export interface UpdateDevicePrinterRequest {
  printer_name?: string
  is_default?: boolean
}

// UDP Communication types
export interface UDPDeviceMessage {
  type: 'device_register' | 'device_heartbeat' | 'device_status' | 'printer_register' | 'printer_status'
  device_id: string
  timestamp: string
  data: any
}

export interface DeviceRegistrationData {
  device_id: string
  name: string
  ip_address: string
  port?: number
  device_type: 'display' | 'customer' | 'window'
  capabilities?: object
  printers?: Array<{
    printer_id: string
    printer_name: string
    is_default?: boolean
  }>
}

export interface DeviceHeartbeatData {
  status: 'online' | 'offline' | 'error'
  uptime?: number
  memory_usage?: number
  cpu_usage?: number
  active_printers?: string[]
}
