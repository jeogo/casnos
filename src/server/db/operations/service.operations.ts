import { getDatabase } from '../connection'
import { Service, DatabaseService } from '../../types'

export const serviceOperations = {
  getAll: (): Service[] => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services ORDER BY name')
    return stmt.all() as Service[]
  },

  getById: (id: number): Service | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?')
    return stmt.get(id) as Service | undefined
  },

  getByName: (name: string): Service | undefined => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM services WHERE name = ?')
    return stmt.get(name) as Service | undefined
  },

  create: (service: DatabaseService): Service => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO services (name, updated_at)
      VALUES (?, CURRENT_TIMESTAMP)
    `)
    const result = stmt.run(service.name)
    return serviceOperations.getById(result.lastInsertRowid as number) as Service
  },

  update: (id: number, service: Partial<DatabaseService>): Service | undefined => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE services
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `)
    return stmt.get(service.name, id) as Service | undefined
  },

  delete: (id: number): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM services WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  exists: (name: string): boolean => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM services WHERE name = ?')
    const result = stmt.get(name) as { count: number }
    return result.count > 0
  },

  getCount: (): number => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM services')
    const result = stmt.get() as { count: number }
    return result.count
  }
}
