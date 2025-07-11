// 📺 Display Window - شاشة العرض
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
const icon = join(__dirname, '../../../build/icon.png');

let displayWindow: BrowserWindow | null = null

export function createDisplayWindow(): BrowserWindow {
  // إنشاء نافذة العرض
  displayWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    title: 'CASNOS - شاشة العرض الرئيسية',
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

  displayWindow.on('ready-to-show', () => {
    displayWindow?.maximize()
    displayWindow?.show()
  })

  displayWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Add keyboard shortcuts for DevTools
  displayWindow.webContents.on('before-input-event', (_event, input) => {
    // F12 to toggle DevTools
    if (input.key === 'F12') {
      if (displayWindow?.webContents.isDevToolsOpened()) {
        displayWindow.webContents.closeDevTools()
      } else {
        displayWindow?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+I to toggle DevTools
    if ((input.control || input.meta) && input.shift && input.key === 'I') {
      if (displayWindow?.webContents.isDevToolsOpened()) {
        displayWindow.webContents.closeDevTools()
      } else {
        displayWindow?.webContents.openDevTools()
      }
    }
  })

  // تحميل شاشة العرض
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    displayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=display')
  } else {
    displayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'display' }
    })
  }

  console.log('[DISPLAY-WINDOW] 📺 Display window created successfully')
  return displayWindow
}

export function getDisplayWindow(): BrowserWindow | null {
  return displayWindow
}

export function closeDisplayWindow(): void {
  if (displayWindow) {
    displayWindow.close()
    displayWindow = null
    console.log('[DISPLAY-WINDOW] 📺 Display window closed')
  }
}

export function focusDisplayWindow(): void {
  if (displayWindow) {
    if (displayWindow.isMinimized()) {
      displayWindow.restore()
    }
    displayWindow.focus()
    console.log('[DISPLAY-WINDOW] 📺 Display window focused')
  }
}
