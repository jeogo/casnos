// 🎬 Video Handlers - معالجات الفيديو
import { ipcMain, dialog } from 'electron'
import videoPlayerService from '../video/videoPlayerService'
import * as fs from 'fs'
import * as path from 'path'

export function setupVideoHandlers() {
  // 🎬 Video Service IPC Handlers

  // تشغيل فيديو - Play video (unified handler - محسن للاستخدام التلقائي)
  ipcMain.handle('video:play', async (_event, filePath?: string) => {
    try {
      console.log(`[IPC-VIDEO] Playing MP4 video: ${filePath || 'auto-detect'}`)
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

  // تشغيل أول فيديو متوفر تلقائياً
  ipcMain.handle('video:play-first-available', async () => {
    try {
      console.log('[IPC-VIDEO] Playing first available video')
      const success = await videoPlayerService.playFirstAvailableVideo()
      return {
        success,
        message: success ? 'First available video started successfully' : 'No videos available or playback failed'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error playing first available video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // الحصول على أول فيديو متوفر
  ipcMain.handle('video:get-first-available', async () => {
    try {
      const firstVideo = videoPlayerService.getFirstAvailableVideo()
      return {
        success: true,
        video: firstVideo,
        message: firstVideo ? `First video: ${firstVideo}` : 'No videos available'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting first available video:', error)
      return {
        success: false,
        video: null,
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

  // فتح نافذة اختيار ملف فيديو جديد
  ipcMain.handle('video:select-new-video', async (_event) => {
    try {
      console.log('[IPC-VIDEO] Opening video file selection dialog')

      const result = await dialog.showOpenDialog({
        title: 'اختر ملف فيديو جديد - Select New Video File',
        properties: ['openFile'],
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v'] },
          { name: 'MP4 Files', extensions: ['mp4'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePaths.length) {
        return {
          success: false,
          message: 'No file selected'
        }
      }

      const selectedFile = result.filePaths[0]
      console.log(`[IPC-VIDEO] User selected video file: ${selectedFile}`)

      return {
        success: true,
        filePath: selectedFile,
        message: 'Video file selected successfully'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error opening video selection dialog:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // نسخ الفيديو الجديد وتعيينه كافتراضي
  ipcMain.handle('video:set-new-default-video', async (_event, sourceFilePath: string) => {
    try {
      console.log(`[IPC-VIDEO] Setting new default video: ${sourceFilePath}`)

      // التحقق من وجود الملف المصدر
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error('Source video file does not exist')
      }

      // الحصول على مجلد الفيديوهات من الخدمة
      const videoFolder = videoPlayerService.getVideoFolder()
      if (!videoFolder) {
        throw new Error('Video folder not found')
      }

      // إنشاء اسم ملف جديد مع تجنب التضارب
      const sourceExt = path.extname(sourceFilePath)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const newFileName = `default-video-${timestamp}${sourceExt}`
      const destinationPath = path.join(videoFolder, newFileName)

      // نسخ الملف
      fs.copyFileSync(sourceFilePath, destinationPath)
      console.log(`[IPC-VIDEO] Video copied to: ${destinationPath}`)

      // تحديث قائمة الفيديوهات في الخدمة
      videoPlayerService.refreshVideoList()

      // ✅ حفظ الفيديو الجديد كافتراضي
      videoPlayerService.setDefaultVideo(newFileName)

      // تشغيل الفيديو الجديد (استخدام اسم الملف فقط وليس المسار الكامل)
      const playResult = await videoPlayerService.playMp4Loop(newFileName)

      // إرسال إشعار للشاشة بأن الفيديو تم تغييره
      if (playResult) {
        console.log(`[IPC-VIDEO] New video successfully set and playing: ${newFileName}`)
      }

      return {
        success: playResult,
        filePath: destinationPath,
        fileName: newFileName,
        message: playResult ? 'New default video set and playing successfully' : 'Video copied but failed to play'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error setting new default video:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // الحصول على أحدث فيديو متوفر
  ipcMain.handle('video:get-most-recent', async () => {
    try {
      const mostRecentVideo = videoPlayerService.getMostRecentVideo()
      return {
        success: true,
        video: mostRecentVideo,
        message: mostRecentVideo ? `Most recent video: ${mostRecentVideo}` : 'No videos available'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting most recent video:', error)
      return {
        success: false,
        video: null,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // الحصول على الفيديو الافتراضي المحفوظ
  ipcMain.handle('video:get-default', async () => {
    try {
      const defaultVideo = videoPlayerService.getDefaultVideo()
      return {
        success: true,
        video: defaultVideo,
        message: defaultVideo ? `Default video: ${defaultVideo}` : 'No default video set'
      }
    } catch (error) {
      console.error('[IPC-VIDEO] Error getting default video:', error)
      return {
        success: false,
        video: null,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  console.log('[HANDLERS] 🎬 Video handlers registered successfully')
}
