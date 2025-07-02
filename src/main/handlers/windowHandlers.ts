// 🪟 Window Handlers - معالجات النوافذ
import { ipcMain } from 'electron'
import { getWindow, focusWindow, closeWindow, WindowType } from '../windows';

export function setupWindowHandlers() {
  // 🪟 IPC handlers for window management - معالجات IPC لإدارة النوافذ
  ipcMain.handle('focus-window', async (_event, windowType: WindowType) => {
    try {
      focusWindow(windowType)
      return { success: true, message: `Window ${windowType} focused` }
    } catch (error) {
      console.error(`[IPC] Error focusing window ${windowType}:`, error)
      return { success: false, message: `Failed to focus window ${windowType}` }
    }
  })

  ipcMain.handle('close-window', async (_event, windowType: WindowType) => {
    try {
      closeWindow(windowType)
      return { success: true, message: `Window ${windowType} closed` }
    } catch (error) {
      console.error(`[IPC] Error closing window ${windowType}:`, error)
      return { success: false, message: `Failed to close window ${windowType}` }
    }
  })

  ipcMain.handle('get-window-status', async (_event, windowType: WindowType) => {
    try {
      const window = getWindow(windowType)
      return {
        success: true,
        isOpen: !!window,
        isVisible: window?.isVisible() || false,
        isMinimized: window?.isMinimized() || false
      }
    } catch (error) {
      console.error(`[IPC] Error getting window status ${windowType}:`, error)
      return { success: false, isOpen: false, isVisible: false, isMinimized: false }
    }
  })

  console.log('[HANDLERS] 🪟 Window handlers registered successfully');
}
