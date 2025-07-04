import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

// Window management
import { createAllWindows, createOptimizedSingleWindow, WindowType } from './windows'

// Essential handlers only
import { registerEssentialHandlers } from './handlers'

// Performance optimization
import { getScreenConfig, setupMemoryOptimization, logOptimizationStatus } from './config/screenOptimization'

// Get screen mode from environment variable
const SCREEN_MODE = process.env.SCREEN_MODE as WindowType | undefined

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    console.log('🚀 Starting CASNOS Electron App initialization...')

    // 1. Setup optimization first
    const config = getScreenConfig(SCREEN_MODE)
    setupMemoryOptimization(config)
    logOptimizationStatus(SCREEN_MODE || 'all', config)
    console.log('✅ Memory optimization configured')

    // 2. Register essential IPC handlers only
    registerEssentialHandlers()
    console.log('✅ Essential IPC handlers registered')

    // 3. Create windows
    if (SCREEN_MODE) {
      console.log(`📱 Creating optimized window for screen: ${SCREEN_MODE}`)
      createOptimizedSingleWindow(SCREEN_MODE)
    } else {
      console.log('📱 Creating all windows...')
      createAllWindows()
    }

    console.log('🎉 CASNOS Electron App initialized in static mode!')

  } catch (error) {
    console.error('❌ Failed to initialize Electron app:', error)
    app.quit()
  }

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
