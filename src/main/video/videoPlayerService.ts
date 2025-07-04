// 🎬 Video Player Service - خدمة مشغل الفيديو
import { BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * خدمة مشغل الفيديو للإعلانات في شاشة العرض
 * Video Player Service for advertisements in Display Screen
 */
export class VideoPlayerService {
  private static instance: VideoPlayerService
  private videoBasePath: string
  private isEnabled: boolean = true
  private currentVideo: string | null = null
  private videoQueue: string[] = []
  private isPlaying: boolean = false

  private constructor() {
    // تحديد مسار ملفات الفيديو
    this.videoBasePath = join(__dirname, '../../resources/assets')
    this.checkVideoFiles()
  }

  static getInstance(): VideoPlayerService {
    if (!VideoPlayerService.instance) {
      VideoPlayerService.instance = new VideoPlayerService()
    }
    return VideoPlayerService.instance
  }

  /**
   * التحقق من وجود ملفات الفيديو (mp4 فقط)
   */
  private checkVideoFiles(): void {
    const mp4Files = ['sample-ad.mp4']

    const missingFiles = mp4Files.filter(file =>
      !existsSync(join(this.videoBasePath, file))
    )

    if (missingFiles.length > 0) {
      console.warn('[VIDEO-SERVICE] ⚠️ Missing MP4 files:', missingFiles)
    } else {
      console.log('[VIDEO-SERVICE] ✅ All MP4 files found')
    }
  }

  /**
   * تشغيل فيديو mp4 في حلقة مكتومة
   * Play MP4 video in muted infinite loop
   */
  async playMp4Loop(videoFileName: string = 'sample-ad.mp4'): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[VIDEO-SERVICE] Video player disabled')
      return false
    }

    // التأكد أنه ملف mp4
    if (!videoFileName.endsWith('.mp4')) {
      console.error('[VIDEO-SERVICE] ❌ Only MP4 files supported')
      return false
    }

    try {
      console.log(`[VIDEO-SERVICE] 🎬 Playing MP4 in loop: ${videoFileName}`)

      const videoPath = join(this.videoBasePath, videoFileName)
      if (!existsSync(videoPath)) {
        console.error(`[VIDEO-SERVICE] ❌ MP4 file not found: ${videoPath}`)
        return false
      }

      // إرسال أمر تشغيل حلقة مكتومة إلى شاشة العرض
      this.sendToDisplayScreen('play-mp4-loop', {
        videoPath: videoFileName,
        videoUrl: `./resources/assets/${videoFileName}`,
        muted: true,
        volume: 0,
        autoplay: true,
        loop: true,
        timestamp: Date.now()
      })

      this.currentVideo = videoFileName
      console.log(`[VIDEO-SERVICE] ✅ MP4 loop command sent: ${videoFileName}`)
      return true

    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error playing MP4 loop:', error)
      return false
    }
  }

  /**
   * تشغيل قائمة فيديوهات
   * Play video playlist
   */
  async playVideoPlaylist(videoFiles: string[]): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[VIDEO-SERVICE] Video player is disabled')
      return false
    }

    try {
      console.log(`[VIDEO-SERVICE] 🎬 Playing video playlist: ${videoFiles.length} videos`)

      // التحقق من وجود جميع الملفات
      const missingFiles = videoFiles.filter(file =>
        !existsSync(join(this.videoBasePath, file))
      )

      if (missingFiles.length > 0) {
        console.warn('[VIDEO-SERVICE] ⚠️ Some playlist videos not found:', missingFiles)
      }

      const validFiles = videoFiles.filter(file =>
        existsSync(join(this.videoBasePath, file))
      )

      if (validFiles.length === 0) {
        console.error('[VIDEO-SERVICE] ❌ No valid video files in playlist')
        return false
      }

      // إرسال قائمة التشغيل إلى شاشة العرض (مكتومة الصوت)
      this.sendToDisplayScreen('play-playlist', {
        playlist: validFiles.map(file => `./resources/assets/${file}`),
        currentIndex: 0,
        muted: true,
        volume: 0,
        timestamp: Date.now()
      })

      this.videoQueue = [...validFiles]
      console.log(`[VIDEO-SERVICE] ✅ Playlist sent to Display Screen: ${validFiles.length} videos`)
      return true

    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error playing playlist:', error)
      return false
    }
  }

  /**
   * إيقاف تشغيل الفيديو الحالي
   * Stop current video playback
   */
  async stopVideo(): Promise<boolean> {
    try {
      console.log('[VIDEO-SERVICE] 🛑 Stopping video playback')

      this.sendToDisplayScreen('stop-video', {
        timestamp: Date.now()
      })

      this.currentVideo = null
      this.isPlaying = false
      console.log('[VIDEO-SERVICE] ✅ Video stop command sent')
      return true

    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error stopping video:', error)
      return false
    }
  }

  /**
   * تشغيل الإعلان التجريبي - سهل الاستخدام
   * Play sample ad - easy to use
   */
  async playSampleAd(): Promise<boolean> {
    return await this.playMp4Loop('sample-ad.mp4')
  }

  /**
   * تشغيل الإعلان التجريبي في حلقة مستمرة
   * Loop the sample advertisement continuously
   */
  async loopSampleAd(): Promise<boolean> {
    return await this.playVideoLoop('sample-ad.mp4', -1)
  }

  /**
   * تشغيل فيديو بحلقة مستمرة
   * Play video in continuous loop
   */
  async playVideoLoop(videoFileName: string, loopCount: number = -1): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[VIDEO-SERVICE] Video player is disabled')
      return false
    }

    try {
      console.log(`[VIDEO-SERVICE] 🔄 Playing video in loop: ${videoFileName} (${loopCount === -1 ? 'infinite' : loopCount} times)`)

      const videoPath = join(this.videoBasePath, videoFileName)
      if (!existsSync(videoPath)) {
        console.error(`[VIDEO-SERVICE] ❌ Video file not found: ${videoPath}`)
        return false
      }

      this.sendToDisplayScreen('play-video-loop', {
        videoPath: videoFileName,
        videoUrl: `./resources/assets/${videoFileName}`,
        loopCount: loopCount,
        muted: true,
        volume: 0,
        timestamp: Date.now()
      })

      console.log(`[VIDEO-SERVICE] ✅ Video loop command sent: ${videoFileName}`)
      return true

    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error playing video loop:', error)
      return false
    }
  }

  /**
   * إرسال أمر لـ شاشة العرض فقط (Display Screen)
   */
  private sendToDisplayScreen(event: string, data: any): void {
    try {
      const allWindows = BrowserWindow.getAllWindows()

      // البحث عن شاشة العرض بناءً على URL
      allWindows.forEach(window => {
        if (window && !window.isDestroyed()) {
          const url = window.webContents.getURL()

          // إذا كان URL يحتوي على ?screen=display فهو شاشة العرض
          if (url.includes('screen=display')) {
            console.log('[VIDEO-SERVICE] 📡 Sending video command to Display Screen')
            window.webContents.send('video:' + event, data)
          }
        }
      })
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error sending to Display Screen:', error)
    }
  }

  /**
   * اختبار النظام المرئي
   */
  async testVideo(): Promise<boolean> {
    try {
      console.log('[VIDEO-SERVICE] 🧪 Testing video system...')

      // اختبار مع الفيديو التجريبي
      const result = await this.playSampleAd()

      console.log('[VIDEO-SERVICE] ✅ Video test completed')
      return result
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Video test failed:', error)
      return false
    }
  }

  /**
   * تمكين/تعطيل النظام المرئي
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    console.log(`[VIDEO-SERVICE] Video player ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * التحقق من حالة النظام المرئي
   */
  isVideoEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * الحصول على معلومات الفيديو الحالي
   */
  getCurrentVideoInfo(): { video: string | null; isPlaying: boolean; queue: string[] } {
    return {
      video: this.currentVideo,
      isPlaying: this.isPlaying,
      queue: [...this.videoQueue]
    }
  }

  /**
   * الحصول على قائمة الفيديوهات المتاحة
   */
  getAvailableVideos(): string[] {
    try {
      const fs = require('fs')
      const videoFiles = fs.readdirSync(this.videoBasePath)
        .filter((file: string) => file.endsWith('.mp4'))

      console.log('[VIDEO-SERVICE] Available videos:', videoFiles)
      return videoFiles
    } catch (error) {
      console.error('[VIDEO-SERVICE] Error reading video directory:', error)
      return ['sample-ad.mp4'] // fallback
    }
  }
}

// إنشاء وتصدير مثيل واحد للاستخدام العام
const videoPlayerService = VideoPlayerService.getInstance()
export default videoPlayerService
