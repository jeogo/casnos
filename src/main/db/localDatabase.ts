import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'

// إعداد قاعدة البيانات المحلية في العملية الرئيسية
// Local database setup in main process

const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'queue.db')

let db: Database.Database | null = null

export interface LocalTicket {
  id?: number
  ticket_number: string
  service_id: number
  service_name: string
  status: 'pending' | 'called' | 'completed' | 'cancelled'
  print_status?: 'pending' | 'printing' | 'printed' | 'print_failed'
  printer_id?: string | null
  created_at?: string
  called_at?: string | null
  window_label?: string | null
  position?: number
  window_number?: number
}

export interface LocalService {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
}

/**
 * تهيئة قاعدة البيانات المحلية
 * Initialize local database connection
 */
export function initializeLocalDatabase(): boolean {
  try {
    // تحقق من وجود ملف قاعدة البيانات
    // Check if database file exists
    if (!existsSync(DB_PATH)) {
      console.warn('[LOCAL-DB] ⚠️ Database file not found at:', DB_PATH)
      return false
    }

    db = new Database(DB_PATH)

    // إعداد أوضاع قاعدة البيانات للوصول المتزامن
    // Set database modes for concurrent access
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = 1000')
    db.pragma('temp_store = memory')

    console.log('[LOCAL-DB] ✅ Local database initialized successfully')
    return true
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Failed to initialize local database:', error)
    return false
  }
}

/**
 * إغلاق اتصال قاعدة البيانات المحلية
 * Close local database connection
 */
export function closeLocalDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[LOCAL-DB] 🔒 Local database connection closed')
  }
}

/**
 * الحصول على الخدمة بالمعرف
 * Get service by ID
 */
export function getServiceById(serviceId: number): LocalService | null {
  if (!db) {
    console.error('[LOCAL-DB] ❌ Database not initialized')
    return null
  }

  try {
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?')
    const service = stmt.get(serviceId) as LocalService | undefined
    return service || null
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error getting service:', error)
    return null
  }
}

/**
 * إنشاء تذكرة جديدة محلياً
 * Create new ticket locally
 */
export function createLocalTicket(serviceId: number, printerId?: string): LocalTicket | null {
  if (!db) {
    console.error('[LOCAL-DB] ❌ Database not initialized')
    return null
  }

  try {
    // التحقق من وجود الخدمة
    // Verify service exists
    const service = getServiceById(serviceId)
    if (!service) {
      console.error('[LOCAL-DB] ❌ Service not found:', serviceId)
      return null
    }

    // توليد رقم التذكرة التالي
    // Generate next ticket number
    const nextNumberStmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_number FROM tickets')
    const result = nextNumberStmt.get() as { next_number: number }
    const nextNumber = result.next_number
    const ticketNumber = nextNumber.toString()

    // إنشاء التذكرة
    // Create ticket
    const insertStmt = db.prepare(`
      INSERT INTO tickets (ticket_number, service_id, service_name, status, print_status, printer_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `)

    const newTicket = insertStmt.get(
      ticketNumber,
      serviceId,
      service.name,
      'pending',
      'pending',
      printerId || null
    ) as LocalTicket

    console.log('[LOCAL-DB] ✅ Ticket created locally:', {
      id: newTicket.id,
      ticket_number: newTicket.ticket_number,
      service_name: newTicket.service_name,
      printer_id: printerId
    })

    return newTicket
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error creating ticket:', error)
    return null
  }
}

/**
 * الحصول على تذكرة بالمعرف
 * Get ticket by ID
 */
export function getTicketById(id: number): LocalTicket | null {
  if (!db) {
    console.error('[LOCAL-DB] ❌ Database not initialized')
    return null
  }

  try {
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?')
    const ticket = stmt.get(id) as LocalTicket | undefined
    return ticket || null
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error getting ticket:', error)
    return null
  }
}

/**
 * الحصول على جميع الخدمات النشطة
 * Get all active services
 */
export function getActiveServices(): LocalService[] {
  if (!db) {
    console.error('[LOCAL-DB] ❌ Database not initialized')
    return []
  }

  try {
    const stmt = db.prepare('SELECT * FROM services WHERE status = ? ORDER BY name')
    return stmt.all('active') as LocalService[]
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error getting services:', error)
    return []
  }
}

/**
 * تحديث حالة الطباعة للتذكرة
 * Update ticket print status
 */
export function updateTicketPrintStatus(
  ticketId: number,
  printStatus: 'pending' | 'printing' | 'printed' | 'print_failed'
): boolean {
  if (!db) {
    console.error('[LOCAL-DB] ❌ Database not initialized')
    return false
  }

  try {
    const stmt = db.prepare('UPDATE tickets SET print_status = ? WHERE id = ?')
    const result = stmt.run(printStatus, ticketId)

    const success = result.changes > 0
    if (success) {
      console.log(`[LOCAL-DB] ✅ Ticket ${ticketId} print status updated to: ${printStatus}`)
    } else {
      console.warn(`[LOCAL-DB] ⚠️ No ticket found with ID: ${ticketId}`)
    }

    return success
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error updating ticket print status:', error)
    return false
  }
}

/**
 * إحصائيات سريعة لقاعدة البيانات المحلية
 * Quick statistics for local database
 */
export function getLocalDatabaseStats(): { services: number; tickets: number; pendingTickets: number } {
  if (!db) {
    return { services: 0, tickets: 0, pendingTickets: 0 }
  }

  try {
    const servicesStmt = db.prepare('SELECT COUNT(*) as count FROM services')
    const ticketsStmt = db.prepare('SELECT COUNT(*) as count FROM tickets')
    const pendingStmt = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?')

    const services = (servicesStmt.get() as { count: number }).count
    const tickets = (ticketsStmt.get() as { count: number }).count
    const pendingTickets = (pendingStmt.get('pending') as { count: number }).count

    return { services, tickets, pendingTickets }
  } catch (error) {
    console.error('[LOCAL-DB] ❌ Error getting database stats:', error)
    return { services: 0, tickets: 0, pendingTickets: 0 }
  }
}
