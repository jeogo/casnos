/**
 * 📁 Shared Path Utilities - Cross-Context Path Management
 * أدوات المسارات المشتركة - إدارة المسارات عبر السياقات المختلفة
 *
 * This module provides path utilities that can be used by both main and server contexts.
 * It determines the correct AppData paths based on the execution context.
 */

import * as path from 'path'
import * as fs from 'fs'

// Safely import app without causing server context issues
let app: any = null;
try {
  const electronModule = require('electron');
  app = electronModule.app;
} catch (error) {
  // Running in server context, app not available
}

/**
 * Get the user's AppData directory for CASNOS
 */
function getAppDataPath(): string {
  try {
    // Try to use Electron's app.getPath if available
    if (app && app.getPath) {
      return app.getPath('userData')
    }
  } catch (error) {
    // Fallback for server context or when Electron is not available
  }

  // Fallback to OS-specific AppData path
  const os = require('os')
  const platform = process.platform
  const appName = 'CASNOS'

  switch (platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', appName)
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName)
    case 'linux':
      return path.join(os.homedir(), '.config', appName)
    default:
      return path.join(os.homedir(), `.${appName}`)
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Get all standard CASNOS AppData paths
 */
export function getCASNOSPaths() {
  const appDataPath = getAppDataPath()
  const dataPath = path.join(appDataPath, 'data')
  const ticketsPath = path.join(appDataPath, 'tickets')
  const logsPath = path.join(appDataPath, 'logs')
  const tempPath = path.join(ticketsPath, 'temp')
  const persistentPath = path.join(dataPath, 'persistent')

  // Ensure all directories exist
  const directories = [appDataPath, dataPath, ticketsPath, logsPath, tempPath, persistentPath]
  directories.forEach(ensureDirectory)

  return {
    appDataPath,
    dataPath,
    ticketsPath,
    logsPath,
    tempPath,
    persistentPath,

    // Specific file paths
    databasePath: path.join(dataPath, 'queue.db'),
    persistentStorageFile: path.join(persistentPath, 'system-state.json'),
    logFile: path.join(logsPath, 'app.log')
  }
}

/**
 * Get a dated tickets directory path
 */
export function getDatedTicketsPath(date?: Date): string {
  const { ticketsPath } = getCASNOSPaths()
  const targetDate = date || new Date()
  const isoString = targetDate.toISOString()
  const dateFolder = isoString.split('T')[0] || isoString.substring(0, 10) // YYYY-MM-DD
  const dailyDir = path.join(ticketsPath, dateFolder)

  ensureDirectory(dailyDir)
  return dailyDir
}

/**
 * Get a ticket file path with date organization
 */
export function getTicketFilePath(ticketNumber: string, serviceName?: string, date?: Date): string {
  const dailyDir = getDatedTicketsPath(date)

  // Clean service name for filename
  const cleanServiceName = serviceName && serviceName.trim()
    ? serviceName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-').replace(/-+/g, '-')
    : 'service'

  const fileName = `${cleanServiceName}-${ticketNumber}.pdf`
  return path.join(dailyDir, fileName)
}

/**
 * Get a temporary file path
 */
export function getTempFilePath(fileName: string): string {
  const { tempPath } = getCASNOSPaths()
  return path.join(tempPath, fileName)
}

/**
 * Initialize the CASNOS AppData structure
 */
export function initializeCASNOSAppData(): void {
  const paths = getCASNOSPaths()

  // Create initial configuration files if they don't exist
  const configFiles = [
    {
      path: paths.persistentStorageFile,
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
        console.log(`[Paths] ✅ Created initial config: ${filePath}`)
      } catch (error) {
        console.error(`[Paths] ❌ Failed to create config: ${filePath}`, error)
      }
    }
  })

  console.log(`[Paths] ✅ CASNOS AppData initialized at: ${paths.appDataPath}`)
}
