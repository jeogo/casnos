// 🎬 Video Handlers - معالجات الفيديو
import { ipcMain } from 'electron'
import videoPlayerService from '../video/videoPlayerService'

export function setupVideoHandlers() {
  // 🎬 Video Service IPC Handlers

  // تشغيل فيديو - Play video (unified handler)
  ipcMain.handle('video:play', async (_event, filePath?: string) => {
    try {
      console.log(`[IPC-VIDEO] Playing MP4 video: ${filePath || 'sample-ad.mp4'}`)
      const success = await videoPlayerService.playMp4Loop(filePath)
      return {
        success,
        message: success ? 'MP4 video started successfully' : 'MP4 video playback failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing MP4 video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تشغيل فيديو إعلاني
  ipcMain.handle('video:play-advertisement', async (_event, videoFileName?: string) => {
    try {
      console.log(`[IPC-VIDEO] Playing MP4 advertisement: ${videoFileName || 'default'}`)
      const success = await videoPlayerService.playMp4Loop(videoFileName)
      return {
        success,
        message: success ? 'MP4 advertisement started successfully' : 'MP4 advertisement playback failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing MP4 advertisement:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تشغيل قائمة فيديوهات
  ipcMain.handle('video:playlist', async (_event, videoFiles: string[]) => {
    try {
      console.log(`[IPC-VIDEO] Playing playlist with ${videoFiles.length} videos`)
      const success = await videoPlayerService.playVideoPlaylist(videoFiles)
      return {
        success,
        message: success ? 'Playlist started successfully' : 'Playlist playback failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing playlist:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // إيقاف تشغيل الفيديو
  ipcMain.handle('video:stop', async () => {
    try {
      console.log('[IPC-VIDEO] Stopping video playback')
      const success = await videoPlayerService.stopVideo()
      return {
        success,
        message: success ? 'Video stopped successfully' : 'Failed to stop video'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error stopping video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تشغيل الفيديو التجريبي
  ipcMain.handle('video:play-sample', async () => {
    try {
      console.log('[IPC-VIDEO] Playing sample advertisement')
      const success = await videoPlayerService.playSampleAd()
      return {
        success,
        message: success ? 'Sample video started successfully' : 'Sample video playback failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing sample video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تشغيل فيديو بحلقة مستمرة (unified API)
  ipcMain.handle('video:loop', async (_event, filePath?: string) => {
    try {
      console.log(`[IPC-VIDEO] Playing MP4 in loop: ${filePath || 'sample-ad.mp4'}`)
      const success = await videoPlayerService.playMp4Loop(filePath || 'sample-ad.mp4')
      return {
        success,
        message: success ? 'MP4 loop started successfully' : 'MP4 loop failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing MP4 loop:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تشغيل فيديو بحلقة مستمرة
  ipcMain.handle('video:play-loop', async (_event, videoFileName: string, loopCount?: number) => {
    try {
      console.log(`[IPC-VIDEO] Playing video loop: ${videoFileName}`)
      const success = await videoPlayerService.playVideoLoop(videoFileName, loopCount)
      return {
        success,
        message: success ? 'Video loop started successfully' : 'Video loop failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing video loop:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // اختبار النظام المرئي
  ipcMain.handle('video:test', async () => {
    try {
      console.log('[IPC-VIDEO] Testing video system...')
      const success = await videoPlayerService.testVideo()
      return {
        success,
        message: success ? 'Video test completed' : 'Video test failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error testing video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // تمكين/تعطيل النظام المرئي
  ipcMain.handle('video:set-enabled', async (_event, enabled: boolean) => {
    try {
      videoPlayerService.setEnabled(enabled)
      return {
        success: true,
        message: `Video player ${enabled ? 'enabled' : 'disabled'}`
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error setting video enabled state:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // التحقق من حالة النظام المرئي
  ipcMain.handle('video:is-enabled', async () => {
    try {
      const enabled = videoPlayerService.isVideoEnabled()
      return {
        success: true,
        enabled
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error checking video enabled state:', error)
      return {
        success: false,
        enabled: false
      }
    }
  })

  // الحصول على معلومات الفيديو الحالي (unified API)
  ipcMain.handle('video:get-info', async () => {
    try {
      const info = videoPlayerService.getCurrentVideoInfo()
      const availableVideos = videoPlayerService.getAvailableVideos()
      const enabled = videoPlayerService.isVideoEnabled()

      return {
        success: true,
        info: {
          ...info,
          enabled,
          availableVideos
        }
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting video info:', error)
      return {
        success: false,
        info: null
      }
    }
  })

  // الحصول على معلومات الفيديو الحالي
  ipcMain.handle('video:get-current-info', async () => {
    try {
      const info = videoPlayerService.getCurrentVideoInfo()
      return {
        success: true,
        info
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting current video info:', error)
      return {
        success: false,
        info: null
      }
    }
  })

  // الحصول على قائمة الفيديوهات المتاحة
  ipcMain.handle('video:get-available-videos', async () => {
    try {
      const videos = videoPlayerService.getAvailableVideos()
      return {
        success: true,
        videos
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting available videos:', error)
      return {
        success: false,
        videos: []
      }
    }
  })

  console.log('[HANDLERS] 🎬 Video handlers registered successfully')
}
