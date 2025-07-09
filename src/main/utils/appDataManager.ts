/**
 * 📁 AppData Manager - Central AppData Path Management
 * مدير مسارات AppData المركزي
 *
 * This class manages all AppData paths for the CASNOS application,
 * ensuring data is stored in the correct user directory for Windows.
 */

import * as path from 'path'
import * as fs from 'fs'
import { getCASNOSPaths, getDatedTicketsPath, getTicketFilePath, getTempFilePath } from '../../shared/pathUtils'

export class AppDataManager {
  private static instance: AppDataManager
  private paths: ReturnType<typeof getCASNOSPaths>

  private constructor() {
    // Get paths from shared utility
    this.paths = getCASNOSPaths()

    console.log(`[AppData] 📁 AppData directory initialized at: ${this.paths.appDataPath}`)

    // Initialize AppData structure
    this.initializeAppData()
  }

  static getInstance(): AppDataManager {
    if (!AppDataManager.instance) {
      AppDataManager.instance = new AppDataManager()
    }
    return AppDataManager.instance
  }

  // ==================== PATH GETTERS ====================

  /**
   * Get the main AppData path
   */
  getAppDataPath(): string {
    return this.paths.appDataPath
  }

  /**
   * Get the data directory path (for database and system data)
   */
  getDataPath(): string {
    return this.paths.dataPath
  }

  /**
   * Get the tickets directory path (for PDF storage)
   */
  getTicketsPath(): string {
    return this.paths.ticketsPath
  }

  /**
   * Get the logs directory path
   */
  getLogsPath(): string {
    return this.paths.logsPath
  }

  /**
   * Get the temporary files directory path
   */
  getTempPath(): string {
    return this.paths.tempPath
  }

  /**
   * Get the persistent storage directory path
   */
  getPersistentStoragePath(): string {
    return this.paths.persistentPath
  }

  // ==================== SPECIFIC FILE PATHS ====================

  /**
   * Get the database file path
   */
  getDatabasePath(): string {
    return this.paths.databasePath
  }

  /**
   * Get the persistent storage file path
   */
  getPersistentStorageFile(): string {
    return this.paths.persistentStorageFile
  }

  /**
   * Get the application log file path
   */
  getLogFile(): string {
    return this.paths.logFile
  }

  /**
   * Get a dated tickets directory path
   */
  getDatedTicketsPath(date?: Date): string {
    return getDatedTicketsPath(date)
  }

  /**
   * Get a ticket file path with date organization
   */
  getTicketFilePath(ticketNumber: string, serviceName?: string, date?: Date): string {
    return getTicketFilePath(ticketNumber, serviceName, date)
  }

  /**
   * Get a temporary file path
   */
  getTempFilePath(fileName: string): string {
    return getTempFilePath(fileName)
  }

  // ==================== DIRECTORY MANAGEMENT ====================

  /**
   * Clean up old temporary files
   */
  cleanupTempFiles(olderThanHours: number = 24): void {
    const tempPath = this.getTempPath()
    if (!fs.existsSync(tempPath)) return

    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)

    try {
      const files = fs.readdirSync(tempPath)
      let cleaned = 0

      files.forEach(file => {
        const filePath = path.join(tempPath, file)
        const stats = fs.statSync(filePath)

        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath)
          cleaned++
        }
      })

      if (cleaned > 0) {
        console.log(`[AppData] 🧹 Cleaned up ${cleaned} temporary files`)
      }
    } catch (error) {
      console.error('[AppData] ❌ Error cleaning temp files:', error)
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalSize: number
    totalFiles: number
    directories: {
      data: { size: number; files: number }
      tickets: { size: number; files: number }
      logs: { size: number; files: number }
      temp: { size: number; files: number }
    }
  } {
    const stats = {
      totalSize: 0,
      totalFiles: 0,
      directories: {
        data: { size: 0, files: 0 },
        tickets: { size: 0, files: 0 },
        logs: { size: 0, files: 0 },
        temp: { size: 0, files: 0 }
      }
    }

    const getDirStats = (dirPath: string) => {
      let size = 0
      let files = 0

      if (fs.existsSync(dirPath)) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true })

        items.forEach(item => {
          const itemPath = path.join(dirPath, item.name)

          if (item.isDirectory()) {
            const subStats = getDirStats(itemPath)
            size += subStats.size
            files += subStats.files
          } else {
            const fileStats = fs.statSync(itemPath)
            size += fileStats.size
            files++
          }
        })
      }

      return { size, files }
    }

    // Calculate stats for each directory
    stats.directories.data = getDirStats(this.getDataPath())
    stats.directories.tickets = getDirStats(this.getTicketsPath())
    stats.directories.logs = getDirStats(this.getLogsPath())
    stats.directories.temp = getDirStats(this.getTempPath())

    // Calculate totals
    stats.totalSize = Object.values(stats.directories).reduce((sum, dir) => sum + dir.size, 0)
    stats.totalFiles = Object.values(stats.directories).reduce((sum, dir) => sum + dir.files, 0)

    return stats
  }

  /**
   * Initialize AppData structure for first-time setup
   */
  initializeAppData(): void {
    console.log('[AppData] 🚀 Initializing AppData structure...')

    // Create initial configuration files if they don't exist
    const configFiles = [
      {
        path: this.getPersistentStorageFile(),
        content: JSON.stringify({
          version: '1.0.0',
          initialized: new Date().toISOString(),
          screens: {}
        }, null, 2)
      }
    ]

    configFiles.forEach(({ path: filePath, content }) => {
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, content)
          console.log(`[AppData] ✅ Created initial config: ${filePath}`)
        } catch (error) {
          console.error(`[AppData] ❌ Failed to create config: ${filePath}`, error)
        }
      }
    })

    // Clean up old temp files
    this.cleanupTempFiles()

    console.log('[AppData] ✅ AppData structure initialized successfully')
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): {
    appDataPath: string
    pathsExist: Record<string, boolean>
    permissions: Record<string, boolean>
    storageStats: {
      totalSize: number
      totalFiles: number
      directories: {
        data: { size: number; files: number }
        tickets: { size: number; files: number }
        logs: { size: number; files: number }
        temp: { size: number; files: number }
      }
    }
  } {
    const paths = {
      appData: this.getAppDataPath(),
      data: this.getDataPath(),
      tickets: this.getTicketsPath(),
      logs: this.getLogsPath(),
      temp: this.getTempPath(),
      persistent: this.getPersistentStoragePath()
    }

    const pathsExist: Record<string, boolean> = {}
    const permissions: Record<string, boolean> = {}

    Object.entries(paths).forEach(([key, pathValue]) => {
      pathsExist[key] = fs.existsSync(pathValue)

      // Test write permissions
      try {
        const testFile = path.join(pathValue, '.test-write')
        fs.writeFileSync(testFile, 'test')
        fs.unlinkSync(testFile)
        permissions[key] = true
      } catch {
        permissions[key] = false
      }
    })

    return {
      appDataPath: this.getAppDataPath(),
      pathsExist,
      permissions,
      storageStats: this.getStorageStats()
    }
  }
}

// Export singleton instance
export const appDataManager = AppDataManager.getInstance()
