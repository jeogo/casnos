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
  createWindowWindow,
  getWindowWindow,
  closeWindowWindow,
  focusWindowWindow
} from './windowWindow'
import {
  createAdminWindow,
  getAdminWindow,
  closeAdminWindow,
  focusAdminWindow
} from './adminWindow'

export type WindowType = 'customer' | 'display' | 'window' | 'admin'

/**
 * إنشاء جميع النوافذ
 * Creates all application windows
 */
export function createAllWindows(): void {
  console.log('[WINDOW-MANAGER] 🪟 Creating all windows...')

  // إنشاء النوافذ الأربع
  createCustomerWindow()
  createDisplayWindow()
  createWindowWindow()
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
    case 'window':
      return getWindowWindow()
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
    case 'window':
      closeWindowWindow()
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
    case 'window':
      focusWindowWindow()
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
  closeWindowWindow()
  closeAdminWindow()

  console.log('[WINDOW-MANAGER] ✅ All windows closed')
}

/**
 * التحقق من وجود نوافذ مفتوحة
 * Check if any windows are open
 */
export function hasOpenWindows(): boolean {
  return !!(getCustomerWindow() || getDisplayWindow() || getWindowWindow() || getAdminWindow())
}

/**
 * الحصول على عدد النوافذ المفتوحة
 * Get count of open windows
 */
export function getOpenWindowsCount(): number {
  let count = 0
  if (getCustomerWindow()) count++
  if (getDisplayWindow()) count++
  if (getWindowWindow()) count++
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
  if (getWindowWindow()) openTypes.push('window')
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

  // Log DevTools status for production debugging
  console.log(`[WINDOW-MANAGER] 🔧 DevTools enabled for ${type} screen: ${config.enableDevTools}`)

  let window: BrowserWindow | null = null

  switch (type) {
    case 'customer':
      window = createCustomerWindow()
      break
    case 'display':
      window = createDisplayWindow()
      break
    case 'window':
      window = createWindowWindow()
      break
    case 'admin':
      window = createAdminWindow()
      break
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
      return null
  }

  // DevTools are now always enabled in production for debugging
  if (window && config.enableDevTools) {
    console.log(`[WINDOW-MANAGER] 🔧 DevTools available for ${type} screen (F12 to open)`)
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
    case 'window':
      return createWindowWindow()
    case 'admin':
      return createAdminWindow()
    default:
      console.warn(`[WINDOW-MANAGER] ⚠️ Unknown window type: ${type}`)
      return null
  }
}
