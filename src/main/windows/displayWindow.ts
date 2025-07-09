// 📺 Display Window - شاشة العرض
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../build/icon.png?asset'

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
      sandbox: false
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
