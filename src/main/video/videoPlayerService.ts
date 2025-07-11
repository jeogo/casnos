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
  private defaultVideoFile: string | null = null // إضافة للاحتفاظ بالفيديو الافتراضي المختار

  private constructor() {
    // تحديد مسار ملفات الفيديو - تم تحديثه ليقرأ من مجلد video
    this.videoBasePath = join(__dirname, '../../resources/video')
    this.checkVideoFiles()
  }

  static getInstance(): VideoPlayerService {
    if (!VideoPlayerService.instance) {
      VideoPlayerService.instance = new VideoPlayerService()
    }
    return VideoPlayerService.instance
  }

  /**
   * التحقق من وجود ملفات الفيديو (أي ملف mp4 في مجلد video)
   */
  private checkVideoFiles(): void {
    try {
      const fs = require('fs')
      const mp4Files = fs.readdirSync(this.videoBasePath)
        .filter((file: string) => file.endsWith('.mp4'))

      if (mp4Files.length === 0) {
        console.warn('[VIDEO-SERVICE] ⚠️ No MP4 files found in video directory:', this.videoBasePath)
      } else {
        console.log('[VIDEO-SERVICE] ✅ Found MP4 files:', mp4Files)
      }
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error checking video directory:', error)
    }
  }

  /**
   * الحصول على أول ملف فيديو متوفر (يأخذ الفيديو الافتراضي المحفوظ في الاعتبار)
   */
  getFirstAvailableVideo(): string | null {
    try {
      // أولاً، تحقق من وجود فيديو افتراضي محفوظ
      const defaultVideo = this.getDefaultVideo()
      if (defaultVideo) {
        console.log(`[VIDEO-SERVICE] 📌 Using saved default video: ${defaultVideo}`)
        return defaultVideo
      }

      // ثانياً، استخدم أحدث فيديو متوفر
      const mostRecent = this.getMostRecentVideo()
      if (mostRecent) {
        console.log(`[VIDEO-SERVICE] 📅 Using most recent video: ${mostRecent}`)
        return mostRecent
      }

      // ثالثاً، استخدم أول فيديو متوفر
      const availableVideos = this.getAvailableVideos()
      if (availableVideos.length > 0) {
        console.log(`[VIDEO-SERVICE] 📁 Using first available video: ${availableVideos[0]}`)
        return availableVideos[0]
      }

      return null
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error getting first available video:', error)
      return null
    }
  }

  /**
   * تشغيل أول فيديو متوفر في حلقة مكتومة
   */
  async playFirstAvailableVideo(): Promise<boolean> {
    const firstVideo = this.getFirstAvailableVideo()
    if (!firstVideo) {
      console.error('[VIDEO-SERVICE] ❌ No videos available to play')
      return false
    }

    console.log(`[VIDEO-SERVICE] 🎬 Playing first available video: ${firstVideo}`)
    return await this.playMp4Loop(firstVideo)
  }
  /**
   * تشغيل فيديو mp4 في حلقة مكتومة (محسن للاستخدام التلقائي)
   * Play MP4 video in muted infinite loop
   */
  async playMp4Loop(videoFileName?: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[VIDEO-SERVICE] Video player disabled')
      return false
    }

    // إذا لم يتم تحديد ملف، استخدم أول ملف متوفر
    let targetVideo = videoFileName
    if (!targetVideo) {
      const firstAvailable = this.getFirstAvailableVideo()
      if (!firstAvailable) {
        console.error('[VIDEO-SERVICE] ❌ No MP4 files available')
        return false
      }
      targetVideo = firstAvailable
    }

    // التأكد أنه ملف mp4
    if (!targetVideo.endsWith('.mp4')) {
      console.error('[VIDEO-SERVICE] ❌ Only MP4 files supported')
      return false
    }

    try {
      console.log(`[VIDEO-SERVICE] 🎬 Playing MP4 in loop: ${targetVideo}`)

      const videoPath = join(this.videoBasePath, targetVideo)
      if (!existsSync(videoPath)) {
        console.error(`[VIDEO-SERVICE] ❌ MP4 file not found: ${videoPath}`)
        return false
      }

      // إرسال أمر تشغيل حلقة مكتومة إلى شاشة العرض
      this.sendToDisplayScreen('play-mp4-loop', {
        videoPath: targetVideo,
        videoUrl: `./video/${targetVideo}`, // تحديث المسار ليناسب الـ renderer
        muted: true,
        volume: 0,
        autoplay: true,
        loop: true,
        timestamp: Date.now()
      })

      this.currentVideo = targetVideo
      console.log(`[VIDEO-SERVICE] ✅ MP4 loop command sent: ${targetVideo}`)
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
        playlist: validFiles.map(file => `./video/${file}`), // تحديث المسار ليناسب الـ renderer
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
   * تشغيل الإعلان التجريبي - سهل الاستخدام (محسن للاستخدام التلقائي)
   * Play sample ad - easy to use
   */
  async playSampleAd(): Promise<boolean> {
    return await this.playFirstAvailableVideo()
  }

  /**
   * تشغيل الإعلان التجريبي في حلقة مستمرة
   * Loop the sample advertisement continuously
   */
  async loopSampleAd(): Promise<boolean> {
    return await this.playFirstAvailableVideo()
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
        videoUrl: `./video/${videoFileName}`, // تحديث المسار ليناسب الـ renderer
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

  /**
   * الحصول على مجلد الفيديوهات
   */
  getVideoFolder(): string {
    return this.videoBasePath
  }

  /**
   * تحديث قائمة الفيديوهات (إعادة فحص المجلد)
   */
  refreshVideoList(): void {
    try {
      console.log('[VIDEO-SERVICE] 🔄 Refreshing video list...')
      this.checkVideoFiles()
      console.log('[VIDEO-SERVICE] ✅ Video list refreshed')
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error refreshing video list:', error)
    }
  }

  /**
   * الحصول على أحدث ملف فيديو (بناءً على تاريخ التعديل)
   * Get the most recently modified video file
   */
  getMostRecentVideo(): string | null {
    try {
      const fs = require('fs')
      const path = require('path')
      const videoFiles = fs.readdirSync(this.videoBasePath)
        .filter((file: string) => file.endsWith('.mp4'))

      if (videoFiles.length === 0) {
        return null
      }

      // Sort by modification time (most recent first)
      const sortedFiles = videoFiles
        .map((file: string) => {
          const filePath = path.join(this.videoBasePath, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            mtime: stats.mtime
          }
        })
        .sort((a: any, b: any) => b.mtime - a.mtime)

      const mostRecent = sortedFiles[0].name
      console.log(`[VIDEO-SERVICE] Most recent video: ${mostRecent}`)
      return mostRecent
    } catch (error) {
      console.error('[VIDEO-SERVICE] Error getting most recent video:', error)
      return null
    }
  }

  /**
   * تشغيل أحدث فيديو متوفر
   * Play the most recently modified video
   */
  async playMostRecentVideo(): Promise<boolean> {
    const recentVideo = this.getMostRecentVideo()
    if (!recentVideo) {
      console.error('[VIDEO-SERVICE] ❌ No recent videos available')
      return false
    }

    console.log(`[VIDEO-SERVICE] 🎬 Playing most recent video: ${recentVideo}`)
    return await this.playMp4Loop(recentVideo)
  }

  /**
   * حفظ الفيديو الافتراضي المختار من المستخدم
   * Save user's preferred default video
   */
  setDefaultVideo(videoFileName: string): void {
    try {
      const fs = require('fs')
      const path = require('path')

      // التحقق من وجود الفيديو
      const videoPath = path.join(this.videoBasePath, videoFileName)
      if (!fs.existsSync(videoPath)) {
        console.error(`[VIDEO-SERVICE] ❌ Cannot set default video - file not found: ${videoPath}`)
        return
      }

      this.defaultVideoFile = videoFileName

      // حفظ الإعداد في ملف
      const configPath = path.join(this.videoBasePath, 'video-config.json')
      const config = { defaultVideo: videoFileName, lastUpdated: new Date().toISOString() }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      console.log(`[VIDEO-SERVICE] ✅ Default video set to: ${videoFileName}`)
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error setting default video:', error)
    }
  }

  /**
   * الحصول على الفيديو الافتراضي المحفوظ
   * Get saved default video
   */
  getDefaultVideo(): string | null {
    try {
      const path = require('path')
      const fs = require('fs')

      // قراءة من الذاكرة أولاً
      if (this.defaultVideoFile) {
        const videoPath = path.join(this.videoBasePath, this.defaultVideoFile)
        if (fs.existsSync(videoPath)) {
          return this.defaultVideoFile
        }
      }

      // قراءة من ملف الإعدادات
      const configPath = path.join(this.videoBasePath, 'video-config.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (config.defaultVideo) {
          const videoPath = path.join(this.videoBasePath, config.defaultVideo)
          if (fs.existsSync(videoPath)) {
            this.defaultVideoFile = config.defaultVideo
            return config.defaultVideo
          }
        }
      }

      return null
    } catch (error) {
      console.error('[VIDEO-SERVICE] ❌ Error getting default video:', error)
      return null
    }
  }
}

// إنشاء وتصدير مثيل واحد للاستخدام العام
const videoPlayerService = VideoPlayerService.getInstance()
export default videoPlayerService
