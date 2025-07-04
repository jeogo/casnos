// 🪟 Window Screen - شاشة الشباك
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../build/icon.png?asset'

let windowWindow: BrowserWindow | null = null

export function createWindowWindow(): BrowserWindow {
  // إنشاء شاشة الشباك
  windowWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    title: 'CASNOS - Window Screen',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  windowWindow.on('ready-to-show', () => {
    windowWindow?.maximize()
    windowWindow?.show()
  })

  windowWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // تحميل شاشة الشباك
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    windowWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=window')
  } else {
    windowWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'window' }
    })
  }

  console.log('[WINDOW-WINDOW] 🪟 Window screen created successfully')
  return windowWindow
}

export function getWindowWindow(): BrowserWindow | null {
  return windowWindow
}

export function closeWindowWindow(): void {
  if (windowWindow) {
    windowWindow.close()
    windowWindow = null
    console.log('[WINDOW-WINDOW] 🪟 Window screen closed')
  }
}

export function focusWindowWindow(): void {
  if (windowWindow) {
    if (windowWindow.isMinimized()) {
      windowWindow.restore()
    }
    windowWindow.focus()
    console.log('[WINDOW-WINDOW] 🪟 Window screen focused')
  }
}
