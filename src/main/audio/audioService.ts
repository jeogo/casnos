// 🔊 Audio Service - خدمة الصوت الرئيسية
// تشغيل الأصوات العربية للمناداة في النظام

import { join } from 'path'
import { existsSync } from 'fs'
import { BrowserWindow } from 'electron'

export class AudioService {
  private static instance: AudioService
  private voiceBasePath: string
  private isEnabled: boolean = true

  private constructor() {
    // مسار ملفات الصوت
    this.voiceBasePath = join(process.cwd(), 'resources', 'voice')
    console.log('[AUDIO-SERVICE] 🔊 Audio service initialized')
    console.log('[AUDIO-SERVICE] Voice files path:', this.voiceBasePath)

    // التحقق من وجود ملفات الصوت
    this.checkVoiceFiles()
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }

  /**
   * التحقق من وجود ملفات الصوت الأساسية
   */
  private checkVoiceFiles(): void {
    const requiredFiles = [
      'ting.mp3',
      'ticket.mp3',
      'please_go_to.mp3',
      'number_1.mp3',
      'counter_1.mp3'
    ]

    const missingFiles = requiredFiles.filter(file =>
      !existsSync(join(this.voiceBasePath, file))
    )

    if (missingFiles.length > 0) {
      console.warn('[AUDIO-SERVICE] ⚠️ Missing voice files:', missingFiles)
      console.warn('[AUDIO-SERVICE] Audio announcements may not work properly')
    } else {
      console.log('[AUDIO-SERVICE] ✅ All required voice files found')
    }
  }

  /**
   * تشغيل مناداة التذكرة
   * Play ticket announcement: "التذكرة رقم X يرجى التوجه إلى الشباك رقم Y"
   */
  async playTicketAnnouncement(ticketNumber: string, windowLabel: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('[AUDIO-SERVICE] Audio is disabled')
      return false
    }

    try {
      console.log(`[AUDIO-SERVICE] 🔊 Playing announcement for ticket ${ticketNumber} to ${windowLabel}`)

      // استخراج رقم الشباك من windowLabel (مثل "الشباك 3" -> "3")
      const windowNumber = this.extractWindowNumber(windowLabel)

      // بناء قائمة الملفات الصوتية للتشغيل المتسلسل
      const audioFiles = this.buildAnnouncementSequence(ticketNumber, windowNumber)

      // إرسال أمر تشغيل الصوت إلى شاشة العرض
      this.sendToDisplayScreen('play-announcement', { audioFiles, ticketNumber, windowLabel })

      console.log(`[AUDIO-SERVICE] ✅ Announcement sent to Display Screen for ticket ${ticketNumber}`)
      return true

    } catch (error) {
      console.error('[AUDIO-SERVICE] ❌ Error playing announcement:', error)
      return false
    }
  }

  /**
   * استخراج رقم الشباك من النص
   */
  private extractWindowNumber(windowLabel: string): string {
    // البحث عن رقم في النص (مثل "الشباك 3" أو "Window 3")
    const numberMatch = windowLabel.match(/\d+/)
    return numberMatch ? numberMatch[0] : '1'
  }

  /**
   * بناء تسلسل الملفات الصوتية للمناداة
   */
  private buildAnnouncementSequence(ticketNumber: string, windowNumber: string): string[] {
    const sequence: string[] = []

    // 🔔 صوت التنبيه أولاً
    sequence.push('ting.mp3')

    // "التذكرة"
    sequence.push('ticket.mp3')

    // "رقم X" - تحويل رقم التذكرة إلى ملفات صوتية
    sequence.push(...this.numberToAudioFiles(ticketNumber))

    // "يرجى التوجه إلى"
    sequence.push('please_go_to.mp3')

    // "الشباك رقم Y"
    const windowNum = parseInt(windowNumber)
    if (windowNum >= 1 && windowNum <= 10) {
      sequence.push(`counter_${windowNum}.mp3`)
    } else {
      // للأرقام الكبيرة، نستخدم "الشباك رقم" + الرقم
      sequence.push('counter_1.mp3') // fallback إلى الشباك 1
    }

    console.log('[AUDIO-SERVICE] Audio sequence:', sequence)
    return sequence
  }

  /**
   * تحويل رقم إلى ملفات صوتية
   */
  private numberToAudioFiles(numberStr: string): string[] {
    const files: string[] = []
    const number = parseInt(numberStr)

    if (number >= 1 && number <= 1000) {
      files.push(`number_${number}.mp3`)
    } else {
      // للأرقام الكبيرة أو غير المتوقعة، نقرأ كل رقم منفصل
      for (const digit of numberStr) {
        if (/\d/.test(digit)) {
          files.push(`number_${digit}.mp3`)
        }
      }
    }

    return files
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
            console.log('[AUDIO-SERVICE] 📡 Sending audio command to Display Screen')
            window.webContents.send('audio:' + event, data)
          }
        }
      })
    } catch (error) {
      console.error('[AUDIO-SERVICE] ❌ Error sending to Display Screen:', error)
    }
  }

  /**
   * اختبار النظام الصوتي
   */
  async testAudio(): Promise<boolean> {
    try {
      console.log('[AUDIO-SERVICE] 🧪 Testing audio system...')

      // اختبار مع تذكرة وهمية
      const result = await this.playTicketAnnouncement("1", "الشباك 1")

      console.log('[AUDIO-SERVICE] ✅ Audio test completed')
      return result
    } catch (error) {
      console.error('[AUDIO-SERVICE] ❌ Audio test failed:', error)
      return false
    }
  }

  /**
   * تمكين/تعطيل النظام الصوتي
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    console.log(`[AUDIO-SERVICE] Audio ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * التحقق من حالة النظام الصوتي
   */
  isAudioEnabled(): boolean {
    return this.isEnabled
  }
}

// تصدير مثيل واحد للاستخدام العام
export const audioService = AudioService.getInstance()
