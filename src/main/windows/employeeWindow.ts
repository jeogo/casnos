// 👨‍💼 Employee Window - شباك الموظف
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../build/icon.png?asset'

let employeeWindow: BrowserWindow | null = null

export function createEmployeeWindow(): BrowserWindow {
  // إنشاء شباك الموظف
  employeeWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    title: 'CASNOS - Employee Screen',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  employeeWindow.on('ready-to-show', () => {
    employeeWindow?.maximize()
    employeeWindow?.show()
  })

  employeeWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // تحميل شباك الموظف
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    employeeWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?screen=employee')
  } else {
    employeeWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { screen: 'employee' }
    })
  }

  console.log('[EMPLOYEE-WINDOW] 👨‍💼 Employee window created successfully')
  return employeeWindow
}

export function getEmployeeWindow(): BrowserWindow | null {
  return employeeWindow
}

export function closeEmployeeWindow(): void {
  if (employeeWindow) {
    employeeWindow.close()
    employeeWindow = null
    console.log('[EMPLOYEE-WINDOW] 👨‍💼 Employee window closed')
  }
}

export function focusEmployeeWindow(): void {
  if (employeeWindow) {
    if (employeeWindow.isMinimized()) {
      employeeWindow.restore()
    }
    employeeWindow.focus()
    console.log('[EMPLOYEE-WINDOW] 👨‍💼 Employee window focused')
  }
}
