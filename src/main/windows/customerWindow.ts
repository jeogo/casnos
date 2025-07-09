// 🛒 Customer Window - شاشة العملاء
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../build/icon.png?asset'

let customerWindow: BrowserWindow | null = null

export function createCustomerWindow(): BrowserWindow {
  // إنشاء نافذة العملاء
  customerWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    title: 'CASNOS - شاشة العملاء والطلبات',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  customerWindow.on('ready-to-show', () => {
    customerWindow?.maximize()
    customerWindow?.show()
  })

  customerWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // تحميل شاشة العملاء
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    customerWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=customer')
  } else {
    customerWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'customer' }
    })
  }

  console.log('[CUSTOMER-WINDOW] 🛒 Customer window created successfully')
  return customerWindow
}

export function getCustomerWindow(): BrowserWindow | null {
  return customerWindow
}

export function closeCustomerWindow(): void {
  if (customerWindow) {
    customerWindow.close()
    customerWindow = null
    console.log('[CUSTOMER-WINDOW] 🛒 Customer window closed')
  }
}

export function focusCustomerWindow(): void {
  if (customerWindow) {
    if (customerWindow.isMinimized()) {
      customerWindow.restore()
    }
    customerWindow.focus()
    console.log('[CUSTOMER-WINDOW] 🛒 Customer window focused')
  }
}
