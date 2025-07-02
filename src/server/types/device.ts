// Device and Printer Management Types

export interface Device {
  id: number
  device_id: string // Unique identifier (MAC address, UUID, etc.)
  name: string
  ip_address: string
  port?: number
  device_type: 'display' | 'customer' | 'employee'
  status: 'online' | 'offline' | 'error'
  last_seen: string
  created_at: string
  updated_at: string
  capabilities?: string // JSON string of capabilities
  metadata?: string // JSON string for additional data
}

export interface DevicePrinter {
  id: number
  device_id: number // Foreign key to devices.id
  printer_id: string // Unique printer identifier
  printer_name: string
  printer_type: 'thermal' | 'laser' | 'inkjet' | 'receipt'
  is_default: boolean
  is_active: boolean
  connection_type: 'usb' | 'network' | 'bluetooth' | 'serial'
  connection_details?: string // JSON string for connection info
  paper_size?: string
  print_quality?: string
  created_at: string
  updated_at: string
}

// Database operations types
export interface DatabaseDevice {
  device_id: string
  name: string
  ip_address: string
  port?: number
  device_type: 'display' | 'customer' | 'employee'
  status?: 'online' | 'offline' | 'error'
  capabilities?: string
  metadata?: string
}

export interface DatabaseDevicePrinter {
  device_id: number
  printer_id: string
  printer_name: string
  printer_type: 'thermal' | 'laser' | 'inkjet' | 'receipt'
  is_default?: boolean
  is_active?: boolean
  connection_type: 'usb' | 'network' | 'bluetooth' | 'serial'
  connection_details?: string
  paper_size?: string
  print_quality?: string
}

// Request types for API
export interface CreateDeviceRequest {
  device_id: string
  name: string
  ip_address: string
  port?: number
  device_type: 'display' | 'customer' | 'employee'
  capabilities?: object
  metadata?: object
}

export interface UpdateDeviceRequest {
  name?: string
  ip_address?: string
  port?: number
  device_type?: 'display' | 'customer' | 'employee'
  status?: 'online' | 'offline' | 'error'
  capabilities?: object
  metadata?: object
}

export interface CreateDevicePrinterRequest {
  printer_id: string
  printer_name: string
  printer_type: 'thermal' | 'laser' | 'inkjet' | 'receipt'
  is_default?: boolean
  is_active?: boolean
  connection_type: 'usb' | 'network' | 'bluetooth' | 'serial'
  connection_details?: object
  paper_size?: string
  print_quality?: string
}

export interface UpdateDevicePrinterRequest {
  printer_name?: string
  printer_type?: 'thermal' | 'laser' | 'inkjet' | 'receipt'
  is_default?: boolean
  is_active?: boolean
  connection_type?: 'usb' | 'network' | 'bluetooth' | 'serial'
  connection_details?: object
  paper_size?: string
  print_quality?: string
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
  device_type: 'display' | 'customer' | 'employee'
  capabilities?: object
  printers?: Array<{
    printer_id: string
    printer_name: string
    printer_type: 'thermal' | 'laser' | 'inkjet' | 'receipt'
    connection_type: 'usb' | 'network' | 'bluetooth' | 'serial'
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
