// 🪟 Window Screen - شاشة الشباك
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
const icon = join(__dirname, '../../../build/icon.png');

let windowWindow: BrowserWindow | null = null

export function createWindowWindow(): BrowserWindow {
  // إنشاء شاشة الشباك - نافذة صغيرة قابلة للتحريك
  windowWindow = new BrowserWindow({
    width: 480,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    maxWidth: 600,
    maxHeight: 800,
    show: false,
    frame: true,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    closable: true,
    skipTaskbar: false,
    hasShadow: true,
    roundedCorners: true,
    title: 'CASNOS - شاشة الشباك والخدمة',
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

  windowWindow.on('ready-to-show', () => {
    windowWindow?.show()
    // Position in top-right corner
    const { screen } = require('electron')
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    windowWindow?.setPosition(screenWidth - 500, 50)
  })

  windowWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle window resize and position requests from renderer with smooth transitions
  windowWindow.webContents.on('ipc-message', (_event, channel, ...args) => {
    if (channel === 'window-resize') {
      const { width, height } = args[0]
      if (windowWindow) {
        // Animate the resize smoothly
        windowWindow.setSize(width, height, true)
      }
    } else if (channel === 'window-position') {
      const { x, y } = args[0]
      if (windowWindow) {
        // Smooth position change
        windowWindow.setPosition(Math.round(x), Math.round(y), true)
      }
    }
  })

  // Add keyboard shortcuts for DevTools
  windowWindow.webContents.on('before-input-event', (_event, input) => {
    // F12 to toggle DevTools
    if (input.key === 'F12') {
      if (windowWindow?.webContents.isDevToolsOpened()) {
        windowWindow.webContents.closeDevTools()
      } else {
        windowWindow?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+I to toggle DevTools
    if ((input.control || input.meta) && input.shift && input.key === 'I') {
      if (windowWindow?.webContents.isDevToolsOpened()) {
        windowWindow.webContents.closeDevTools()
      } else {
        windowWindow?.webContents.openDevTools()
      }
    }
  })

  // تحميل شاشة الشباك
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    windowWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=window')
  } else {
    windowWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'window' }
    })
  }

  console.log('[WINDOW-WINDOW] 🪟 Floating window created successfully')
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
