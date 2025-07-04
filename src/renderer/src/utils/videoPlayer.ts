// 🎬 Video Player Component for Display Screen - مشغل الفيديو لشاشة العرض
// تشغيل تلقائي مكتوم في حلقة لا نهائية

export interface VideoPlayerConfig {
  enabled: boolean
  autoplay: boolean
  loop: boolean
  muted: boolean
}

/**
 * مشغل الفيديوهات البسيط - حلقة لا نهائية مكتومة
 */
export class VideoPlayer {
  private static instance: VideoPlayer
  private config: VideoPlayerConfig

  private constructor() {
    this.config = {
      enabled: true,
      autoplay: true,
      loop: true,
      muted: true
    }

    this.setupEventListeners()
  }

  static getInstance(): VideoPlayer {
    if (!VideoPlayer.instance) {
      VideoPlayer.instance = new VideoPlayer()
    }
    return VideoPlayer.instance
  }

  /**
   * إعداد مستمعي الأحداث من main process
   */
  private setupEventListeners(): void {
    if (window.electron?.ipcRenderer) {
      // تشغيل فيديو واحد في حلقة لا نهائية
      window.electron.ipcRenderer.on('video:play-video', (_event, data) => {
        console.log('[VIDEO-PLAYER] 📨 تشغيل فيديو:', data)
        if (data.videoUrl) {
          this.playVideo(data.videoUrl)
        }
      })

      // تشغيل حلقة فيديو
      window.electron.ipcRenderer.on('video:play-video-loop', (_event, data) => {
        console.log('[VIDEO-PLAYER] 📨 تشغيل فيديو حلقة:', data)
        if (data.videoUrl) {
          this.playVideo(data.videoUrl)
        }
      })

      console.log('[VIDEO-PLAYER] ✅ تم إعداد المستمعين')
    }
  }

  /**
   * تشغيل فيديو واحد في حلقة لا نهائية مكتومة
   */
  async playVideo(videoUrl: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[VIDEO-PLAYER] مشغل الفيديو معطل')
      return false
    }

    try {
      console.log(`[VIDEO-PLAYER] 🎬 تشغيل فيديو: ${videoUrl}`)

      // إزالة أي فيديو موجود
      this.removeCurrentVideo()

      // إنشاء عنصر فيديو جديد
      const video = this.createVideoElement()

      // إعدادات الفيديو: تشغيل تلقائي، حلقة لا نهائية، مكتوم
      video.src = videoUrl
      video.autoplay = true
      video.loop = true
      video.muted = true
      video.volume = 0

      // إضافة إلى الصفحة
      document.body.appendChild(video)

      // تشغيل
      await video.play()

      console.log(`[VIDEO-PLAYER] ✅ يتم تشغيل الفيديو في حلقة لا نهائية: ${videoUrl}`)
      return true

    } catch (error) {
      console.error('[VIDEO-PLAYER] ❌ خطأ في تشغيل الفيديو:', error)
      return false
    }
  }

  /**
   * إنشاء عنصر فيديو
   */
  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video')

    // ملء الشاشة
    video.style.position = 'fixed'
    video.style.top = '0'
    video.style.left = '0'
    video.style.width = '100vw'
    video.style.height = '100vh'
    video.style.objectFit = 'cover'
    video.style.zIndex = '1000'
    video.style.backgroundColor = 'black'

    video.id = 'casnos-video-player'

    return video
  }

  /**
   * إزالة الفيديو الحالي
   */
  private removeCurrentVideo(): void {
    const existingVideo = document.getElementById('casnos-video-player')
    if (existingVideo) {
      existingVideo.remove()
    }
  }

  /**
   * تشغيل الإعلان التجريبي
   */
  async playSampleAd(): Promise<boolean> {
    return await this.playVideo('./resources/assets/sample-ad.mp4')
  }

  /**
   * تمكين/تعطيل
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    console.log(`[VIDEO-PLAYER] ${enabled ? 'مفعل' : 'معطل'}`)
  }
}

// المثيل الوحيد
export const videoPlayer = VideoPlayer.getInstance()
