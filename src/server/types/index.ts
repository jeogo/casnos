export interface Service {
  id: number
  name: string
}

export interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  status: 'pending' | 'called' | 'served'
  print_status: 'pending' | 'printing' | 'printed' | 'print_failed'
  created_at: string
  called_at: string | null
  window_id?: number
  position?: number
}

export interface Window {
  id: number
  active: boolean
}

export interface CreateTicketRequest {
  service_id: number
}

// New interface for network printing
export interface CreateNetworkPrintTicketRequest {
  service_id: number
  ticketData: {
    service_name: string
    company_name: string
    position?: number
    window_number?: number
  }
}

export interface CallTicketRequest {
  ticket_id: number
  window_id: number
}

export interface CreateServiceRequest {
  name: string
}

export interface CreateWindowRequest {
  active?: boolean
}


export interface DatabaseService {
  name: string
}

export interface DatabaseTicket {
  service_id: number
  status?: 'pending' | 'called' | 'served'
  print_status?: 'pending' | 'printing' | 'printed' | 'print_failed'
  window_id?: number
}

export interface DatabaseWindow {
  active?: boolean // Using shorter name to match DB schema
}

// Re-export device types for convenience
export * from './device'
