// 🔧 Admin Window - شاشة الإدارة
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../build/icon.png?asset'

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
      sandbox: false
    }
  })

  adminWindow.on('ready-to-show', () => {
    adminWindow?.maximize()
    adminWindow?.show()
  })

  adminWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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
