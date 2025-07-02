// 🔊 Audio Player for Display Screen - مشغل الصوت لشاشة العرض
// يتعامل مع تشغيل الأصوات في المتصفح (renderer process)

export interface AudioPlayerConfig {
  volume: number
  enabled: boolean
  basePath: string
}

/**
 * مشغل الأصوات في شاشة العرض
 * Audio Player for Display Screen
 */
export class AudioPlayer {
  private static instance: AudioPlayer
  private config: AudioPlayerConfig
  private currentAudio: HTMLAudioElement | null = null
  private audioQueue: string[] = []
  private isPlaying: boolean = false

  private constructor() {
    this.config = {
      volume: 0.8,
      enabled: true,
      basePath: this.getVoiceFilesPath() // تحديد المسار بذكاء
    }

    this.setupEventListeners()
  }

  /**
   * تحديد مسار ملفات الصوت حسب البيئة
   */
  private getVoiceFilesPath(): string {
    // في بيئة التطوير (dev server) - الملفات متاحة من publicDir
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return '/voice' // بسبب إعداد publicDir في vite config
    }

    // في بيئة الإنتاج (file:// protocol)
    if (window.location.protocol === 'file:') {
      return '../../../resources/voice'
    }

    // fallback
    return './resources/voice'
  }

  static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer()
    }
    return AudioPlayer.instance
  }

  /**
   * إعداد مستمعي الأحداث من main process
   */
  private setupEventListeners(): void {
    // استقبال أوامر الصوت من main process
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('audio:play-announcement', (_event, data) => {
        console.log('[AUDIO-PLAYER] 📨 Received audio command from main process:', data)
        if (data.audioFiles && Array.isArray(data.audioFiles)) {
          this.playAudioSequence(data.audioFiles)
        }
      })

      console.log('[AUDIO-PLAYER] ✅ IPC listeners setup completed')
    }

    // إضافة مستمع لأحداث Socket.IO إذا لزم الأمر
    if (typeof window !== 'undefined') {
      console.log('[AUDIO-PLAYER] Event listeners setup completed')
    }
  }

  /**
   * تشغيل مناداة التذكرة مباشرة في المتصفح
   * Play ticket announcement directly in renderer process
   */
  async playAnnouncement(ticketNumber: string, windowLabel: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[AUDIO-PLAYER] Audio is disabled')
      return false
    }

    try {
      console.log(`[AUDIO-PLAYER] 🔊 Playing announcement: Ticket ${ticketNumber} to ${windowLabel}`)

      // تشغيل مباشر في renderer process
      console.log('[AUDIO-PLAYER] Starting direct audio playback in renderer')
      const audioSequence = this.buildAnnouncementSequence(ticketNumber, windowLabel)
      console.log('[AUDIO-PLAYER] Audio sequence built:', audioSequence)

      await this.playAudioSequence(audioSequence)

      console.log(`[AUDIO-PLAYER] ✅ Direct announcement completed`)
      return true

    } catch (error) {
      console.error('[AUDIO-PLAYER] ❌ Error playing announcement:', error)
      return false
    }
  }

  /**
   * بناء تسلسل الملفات الصوتية
   */
  private buildAnnouncementSequence(ticketNumber: string, windowLabel: string): string[] {
    const sequence: string[] = []

    // "التذكرة"
    sequence.push('ticket.mp3')

    // "رقم X"
    const number = parseInt(ticketNumber)
    if (number >= 1 && number <= 1000) {
      sequence.push(`number_${number}.mp3`)
    }

    // "يرجى التوجه إلى"
    sequence.push('please_go_to.mp3')

    // "الشباك رقم Y"
    const windowNumber = this.extractWindowNumber(windowLabel)
    const windowNum = parseInt(windowNumber)
    if (windowNum >= 1 && windowNum <= 10) {
      sequence.push(`counter_${windowNum}.mp3`)
    }

    console.log('[AUDIO-PLAYER] Audio sequence:', sequence)
    return sequence
  }

  /**
   * استخراج رقم الشباك
   */
  private extractWindowNumber(windowLabel: string): string {
    const numberMatch = windowLabel.match(/\d+/)
    return numberMatch ? numberMatch[0] : '1'
  }

  /**
   * تشغيل تسلسل من الملفات الصوتية
   */
  private async playAudioSequence(audioFiles: string[]): Promise<void> {
    if (!this.config.enabled) {
      console.log('[AUDIO-PLAYER] Audio disabled, skipping playback')
      return
    }

    this.audioQueue = [...audioFiles]
    await this.processAudioQueue()
  }

  /**
   * معالجة قائمة انتظار الصوت
   */
  private async processAudioQueue(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return
    }

    this.isPlaying = true

    while (this.audioQueue.length > 0) {
      const audioFile = this.audioQueue.shift()!
      try {
        await this.playAudioFile(audioFile)
        // توقف قصير بين الملفات (200ms)
        await this.delay(200)
      } catch (error) {
        console.error(`[AUDIO-PLAYER] Error playing ${audioFile}:`, error)
      }
    }

    this.isPlaying = false
    console.log('[AUDIO-PLAYER] ✅ Audio sequence completed')
  }

  /**
   * تشغيل ملف صوتي واحد
   */
  private async playAudioFile(fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // إنشاء عنصر Audio جديد
        const audio = new Audio()
        this.currentAudio = audio

        // تحديد مسار الملف الصوتي بطريقة بسيطة
        const audioPath = `${this.config.basePath}/${fileName}`
        audio.src = audioPath
        audio.volume = this.config.volume
        audio.preload = 'auto'

        console.log(`[AUDIO-PLAYER] 🎵 Playing: ${fileName} from ${audioPath}`)

        // تعيين timeout لتجنب التعليق
        const timeout = setTimeout(() => {
          console.warn(`[AUDIO-PLAYER] ⏰ Timeout playing ${fileName}`)
          reject(new Error('Audio playback timeout'))
        }, 10000) // 10 ثواني

        // الأحداث
        audio.oncanplaythrough = () => {
          audio.play().catch(error => {
            clearTimeout(timeout)
            console.error(`[AUDIO-PLAYER] Error playing ${fileName}:`, error)
            reject(error)
          })
        }

        audio.onended = () => {
          clearTimeout(timeout)
          console.log(`[AUDIO-PLAYER] ✅ Finished playing: ${fileName}`)
          resolve()
        }

        audio.onerror = (error) => {
          clearTimeout(timeout)
          console.error(`[AUDIO-PLAYER] ❌ Error loading ${fileName}:`, error)
          reject(error)
        }

        audio.onabort = () => {
          clearTimeout(timeout)
          console.warn(`[AUDIO-PLAYER] ⚠️ Audio loading aborted: ${fileName}`)
          reject(new Error('Audio loading aborted'))
        }

        // بدء التحميل
        audio.load()

      } catch (error) {
        console.error(`[AUDIO-PLAYER] ❌ Exception playing ${fileName}:`, error)
        reject(error)
      }
    })
  }

  /**
   * توقف لفترة محددة
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * إيقاف التشغيل الحالي
   */
  stopPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }

    this.audioQueue = []
    this.isPlaying = false
    console.log('[AUDIO-PLAYER] 🛑 Audio playback stopped')
  }

  /**
   * تعيين مستوى الصوت
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume))
    if (this.currentAudio) {
      this.currentAudio.volume = this.config.volume
    }
    console.log(`[AUDIO-PLAYER] 🔊 Volume set to ${this.config.volume}`)
  }

  /**
   * تمكين/تعطيل الصوت
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    if (!enabled) {
      this.stopPlayback()
    }
    console.log(`[AUDIO-PLAYER] Audio ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * اختبار تشغيل الصوت
   */
  async testAudio(): Promise<boolean> {
    try {
      console.log('[AUDIO-PLAYER] 🧪 Testing audio playback...')
      await this.playAnnouncement("1", "الشباك 1")
      return true
    } catch (error) {
      console.error('[AUDIO-PLAYER] ❌ Audio test failed:', error)
      return false
    }
  }
}

// تصدير مثيل واحد للاستخدام العام
export const audioPlayer = AudioPlayer.getInstance()
