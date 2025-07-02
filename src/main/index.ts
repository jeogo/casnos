import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

// 🪟 استيراد مدير النوافذ - Window Manager
import { createAllWindows, createOptimizedSingleWindow, WindowType } from './windows'

// 🔧 استيراد معالجات IPC المحسنة - Import optimized IPC handlers
import { registerOptimizedIPCHandlers, startOptimizedServerInfoSync } from './handlers'

// 🌐 استيراد خدمة اكتشاف الخادم - Import UDP discovery service
import { initializeUDPDiscovery, cleanupUDPDiscovery } from './services/udpDiscoveryService'

// 🎯 استيراد تحسين الأداء - Import performance optimization
import { getScreenConfig, setupMemoryOptimization, logOptimizationStatus } from './config/screenOptimization'

// Get screen mode from environment variable
const SCREEN_MODE = process.env.SCREEN_MODE as WindowType | undefined

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 🎯 إعداد التحسين المخصص للشاشة - Setup screen-specific optimization
  const config = getScreenConfig(SCREEN_MODE)
  setupMemoryOptimization(config)
  logOptimizationStatus(SCREEN_MODE || 'all', config)

  // 🔧 تسجيل معالجات IPC المحسنة - Register optimized IPC handlers
  registerOptimizedIPCHandlers(SCREEN_MODE)

  // 🪟 إنشاء النوافذ حسب الوضع - Create windows based on mode
  if (SCREEN_MODE) {
    // Starting in specific screen mode
    createOptimizedSingleWindow(SCREEN_MODE)
  } else {
    // Starting in all screens mode
    createAllWindows()
  }

  // 🌐 تهيئة اكتشاف الخادم مع التحسين - Initialize optimized UDP discovery
  setTimeout(() => {
    if (config.udpDiscovery) {
      initializeUDPDiscovery()
      startOptimizedServerInfoSync(SCREEN_MODE) // Start optimized server info sync
      // UDP discovery initialized for screen
    } else {
      // UDP discovery skipped for screen (optimization)
    }
  }, 1000) // Wait 1 second for everything to be ready

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      if (SCREEN_MODE) {
        createOptimizedSingleWindow(SCREEN_MODE)
      } else {
        createAllWindows()
      }
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 🌐 تنظيف موارد UDP - Clean up UDP resources
  cleanupUDPDiscovery()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
