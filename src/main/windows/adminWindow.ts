// 🔧 Admin Window - شاشة الإدارة
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
const icon = join(__dirname, '../../../build/icon.png');

let adminWindow: BrowserWindow | null = null

export function createAdminWindow(): BrowserWindow {
  // إنشاء شاشة الإدارة
  adminWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    title: 'CASNOS - شاشة الإدارة والتحكم',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Enable DevTools in production
      devTools: true, // Explicitly enable DevTools
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  adminWindow.on('ready-to-show', () => {
    adminWindow?.maximize()
    adminWindow?.show()

    // Enable DevTools in production for debugging
    if (!adminWindow?.webContents.isDevToolsOpened()) {
      console.log('[ADMIN-WINDOW] 🔧 Opening DevTools for debugging')
      // Uncomment the next line if you want DevTools to open automatically
      // adminWindow?.webContents.openDevTools()
    }
  })

  adminWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Add keyboard shortcuts for DevTools
  adminWindow.webContents.on('before-input-event', (_event, input) => {
    // F12 to toggle DevTools
    if (input.key === 'F12') {
      if (adminWindow?.webContents.isDevToolsOpened()) {
        adminWindow.webContents.closeDevTools()
      } else {
        adminWindow?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+I to toggle DevTools
    if ((input.control || input.meta) && input.shift && input.key === 'I') {
      if (adminWindow?.webContents.isDevToolsOpened()) {
        adminWindow.webContents.closeDevTools()
      } else {
        adminWindow?.webContents.openDevTools()
      }
    }
  })

  // تحميل شاشة الإدارة
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    adminWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=admin')
  } else {
    adminWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'admin' }
    })
  }

  // Admin window created successfully
  return adminWindow
}

export function getAdminWindow(): BrowserWindow | null {
  return adminWindow
}

export function closeAdminWindow(): void {
  if (adminWindow) {
    adminWindow.close()
    adminWindow = null
    console.log('[ADMIN-WINDOW] 🔧 Admin window closed')
  }
}

export function focusAdminWindow(): void {
  if (adminWindow) {
    if (adminWindow.isMinimized()) {
      adminWindow.restore()
    }
    adminWindow.focus()
    console.log('[ADMIN-WINDOW] 🔧 Admin window focused')
  }
}
