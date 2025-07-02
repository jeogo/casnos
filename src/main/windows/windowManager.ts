// 🪟 Window Manager - مدير النوافذ
// هذا الملف يدير جميع النوافذ بشكل مركزي

import { BrowserWindow } from 'electron'
import { getScreenConfig } from '../config/screenOptimization'
import {
  createCustomerWindow,
  getCustomerWindow,
  closeCustomerWindow,
  focusCustomerWindow
} from './customerWindow'
import {
  createDisplayWindow,
  getDisplayWindow,
  closeDisplayWindow,
  focusDisplayWindow
} from './displayWindow'
import {
  createEmployeeWindow,
  getEmployeeWindow,
  closeEmployeeWindow,
  focusEmployeeWindow
} from './employeeWindow'
import {
  createAdminWindow,
  getAdminWindow,
  closeAdminWindow,
  focusAdminWindow
} from './adminWindow'

export type WindowType = 'customer' | 'display' | 'employee' | 'admin'

/**
 * إنشاء جميع النوافذ
 * Creates all application windows
 */
export function createAllWindows(): void {
  console.log('[WINDOW-MANAGER] 🪟 Creating all windows...')

  // إنشاء النوافذ الأربع
  createCustomerWindow()
  createDisplayWindow()
  createEmployeeWindow()
  createAdminWindow()

  console.log('[WINDOW-MANAGER] ✅ All windows created successfully')
}

/**
 * الحصول على نافذة بالنوع
 * Get window by type
 */
export function getWindow(type: WindowType): BrowserWindow | null {
  switch (type) {
    case 'customer':
      return getCustomerWindow()
    case 'display':
      return getDisplayWindow()
    case 'employee':
      return getEmployeeWindow()
    case 'admin':
      return getAdminWindow()
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
      return null
  }
}

/**
 * إغلاق نافذة بالنوع
 * Close window by type
 */
export function closeWindow(type: WindowType): void {
  switch (type) {
    case 'customer':
      closeCustomerWindow()
      break
    case 'display':
      closeDisplayWindow()
      break
    case 'employee':
      closeEmployeeWindow()
      break
    case 'admin':
      closeAdminWindow()
      break
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
  }
}

/**
 * التركيز على نافذة بالنوع
 * Focus window by type
 */
export function focusWindow(type: WindowType): void {
  switch (type) {
    case 'customer':
      focusCustomerWindow()
      break
    case 'display':
      focusDisplayWindow()
      break
    case 'employee':
      focusEmployeeWindow()
      break
    case 'admin':
      focusAdminWindow()
      break
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
  }
}

/**
 * إغلاق جميع النوافذ
 * Close all windows
 */
export function closeAllWindows(): void {
  console.log('[WINDOW-MANAGER] 🪟 Closing all windows...')

  closeCustomerWindow()
  closeDisplayWindow()
  closeEmployeeWindow()
  closeAdminWindow()

  console.log('[WINDOW-MANAGER] ✅ All windows closed')
}

/**
 * التحقق من وجود نوافذ مفتوحة
 * Check if any windows are open
 */
export function hasOpenWindows(): boolean {
  return !!(getCustomerWindow() || getDisplayWindow() || getEmployeeWindow() || getAdminWindow())
}

/**
 * الحصول على عدد النوافذ المفتوحة
 * Get count of open windows
 */
export function getOpenWindowsCount(): number {
  let count = 0
  if (getCustomerWindow()) count++
  if (getDisplayWindow()) count++
  if (getEmployeeWindow()) count++
  if (getAdminWindow()) count++
  return count
}

/**
 * الحصول على قائمة بأنواع النوافذ المفتوحة
 * Get list of open window types
 */
export function getOpenWindowTypes(): WindowType[] {
  const openTypes: WindowType[] = []

  if (getCustomerWindow()) openTypes.push('customer')
  if (getDisplayWindow()) openTypes.push('display')
  if (getEmployeeWindow()) openTypes.push('employee')
  if (getAdminWindow()) openTypes.push('admin')

  return openTypes
}

/**
 * إنشاء نافذة واحدة محسنة حسب النوع
 * Create optimized single window by type
 */
export function createOptimizedSingleWindow(type: WindowType): BrowserWindow | null {
  console.log(`[WINDOW-MANAGER] 🎯 Creating optimized single window: ${type}`)

  const config = getScreenConfig(type)

  // Apply performance optimizations before window creation
  if (!config.enableDevTools) {
    console.log(`[WINDOW-MANAGER] ⚡ DevTools disabled for ${type} screen (performance optimization)`)
  }

  let window: BrowserWindow | null = null

  switch (type) {
    case 'customer':
      window = createCustomerWindow()
      break
    case 'display':
      window = createDisplayWindow()
      break
    case 'employee':
      window = createEmployeeWindow()
      break
    case 'admin':
      window = createAdminWindow()
      break
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
      return null
  }

  if (window && !config.enableDevTools) {
    // Disable DevTools for better performance
    window.webContents.on('devtools-opened', () => {
      window.webContents.closeDevTools()
    })
  }

  return window
}

/**
 * إنشاء نافذة واحدة فقط حسب النوع (محسن)
 * Create single window by type (optimized)
 */
export function createSingleWindow(type: WindowType): BrowserWindow | null {
  console.log(`[WINDOW-MANAGER] 🪟 Creating single window: ${type}`)

  switch (type) {
    case 'customer':
      return createCustomerWindow()
    case 'display':
      return createDisplayWindow()
    case 'employee':
      return createEmployeeWindow()
    case 'admin':
      return createAdminWindow()
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
      return null
  }
}
