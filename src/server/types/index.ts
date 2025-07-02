export interface Service {
  id: number
  name: string
}

export interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  service_name: string
  status: 'pending' | 'called' | 'served'
  print_status: 'pending' | 'printing' | 'printed' | 'print_failed'
  created_at: string
  called_at: string | null
  window_label: string | null
  printer_id: string | null
  target_device: string | null
  position?: number
}

export interface Window {
  id: number
  label: string
  active: boolean
}

export interface Employee {
  id: number
  window_number: string
  device_id?: string
  service_id: number | null
  service_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTicketRequest {
  service_id: number
  printer_id?: string
  target_device?: string
}

// New interface for network printing
export interface CreateNetworkPrintTicketRequest {
  service_id: number
  printer_id: string
  target_device: string
  ticketData: {
    service_name: string
    company_name: string
    position?: number
    window_number?: number
  }
}

export interface CallTicketRequest {
  ticket_id: number
  window_label: string
}

export interface CreateServiceRequest {
  name: string
}

export interface CreateWindowRequest {
  label: string
  active?: boolean
}

export interface AssignWindowServicesRequest {
  service_ids: number[]
}

export interface DatabaseService {
  name: string
}

export interface DatabaseTicket {
  service_id: number
  service_name: string
  status: 'pending' | 'called' | 'served'
  print_status?: 'pending' | 'printing' | 'printed' | 'print_failed'
  printer_id?: string | null
  target_device?: string | null
}

export interface DatabaseWindow {
  label: string
  active?: boolean
}

export interface DatabaseEmployee {
  window_number: string
  device_id?: string
  service_id?: number | null
  service_name?: string | null
  is_active?: boolean
}

// Re-export device types for convenience
export * from './device'
