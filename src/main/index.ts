import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

// Initialize AppData structure first
import { initializeCASNOSAppData } from '../shared/pathUtils'

// Window management
import { createAllWindows, createOptimizedSingleWindow, WindowType } from './windows'

// Essential handlers only
import { registerEssentialHandlers } from './handlers'

// Performance optimization
import { getScreenConfig, setupMemoryOptimization, logOptimizationStatus } from './config/screenOptimization'

// 🎯 NEW: Screen Detection and Server Management
import { screenDetectionManager } from './config/screenDetection'
import { embeddedServerManager } from './server/embeddedServerManager'

// 🔗 Resource Protocol for video/audio serving
import { registerResourceProtocol, registerHttpResourceProtocol } from './protocols/resourceProtocol'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize AppData structure first
  initializeCASNOSAppData()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    // 🔗 IMPORTANT: Register resource protocols before creating windows
    registerResourceProtocol()
    registerHttpResourceProtocol()

    // 🎯 NEW: Load screen configuration from JSON
    const screenConfig = screenDetectionManager.loadConfiguration()
    const screenType = screenConfig.screenType as WindowType

    console.log(`[MAIN] 🎯 JSON Config Detected: ${screenType}`)
    console.log(`[MAIN] 🌐 Server Enabled: ${screenConfig.embeddedServer.enabled}`)

    // 1. Start embedded server if enabled
    if (screenConfig.embeddedServer.enabled) {
      await embeddedServerManager.startServer()
    }

    // 2. Setup optimization
    const config = getScreenConfig(screenType)
    setupMemoryOptimization(config)
    logOptimizationStatus(screenType, config)

    // 3. Register essential IPC handlers only
    registerEssentialHandlers()

    // 4. Create the specific screen window
    createOptimizedSingleWindow(screenType)

  } catch (error) {
    console.error('[MAIN] Failed to initialize Electron app:', error)
    app.quit()
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const screenConfig = screenDetectionManager.getCurrentConfiguration()
      if (screenConfig) {
        createOptimizedSingleWindow(screenConfig.screenType as WindowType)
      } else {
        createAllWindows()
      }
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Cleanup server if running
  await embeddedServerManager.cleanup()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app quit - cleanup server
app.on('before-quit', async () => {
  await embeddedServerManager.cleanup()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
