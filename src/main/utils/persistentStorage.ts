/**
 * 🔄 Persistent Storage Manager
 * نظام حفظ البيانات المستمر لجميع الشاشات
 * يحفظ البيانات عند انقطاع الاتصال ويستعيدها عند إعادة الاتصال
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCASNOSPaths } from '../shared/pathUtils';

// Types for persistent data
interface PersistentScreenData {
  screenType: 'display' | 'window' | 'customer' | 'admin';
  deviceId: string;
  timestamp: string;
  data: {
    // Queue data
    queueData?: {
      pending: any[];
      total: number;
      timestamp: string;
    };
    // Connection info
    serverInfo?: {
      ip: string;
      port: number;
      connected: boolean;
    };
    // Device registration
    deviceInfo?: any;
    windowData?: any;
    selectedService?: any;
    selectedPrinter?: any;
    // Audio queue for display
    audioQueue?: any[];
    currentAudioCall?: any;
    // Any other screen-specific data
    customData?: Record<string, any>;
  };
}

interface PersistentSystemState {
  lastUpdate: string;
  serverStatus: string;
  globalData: {
    services: any[];
    windows: any[];
    devices: any[];
    printers: any[];
  };
  screens: Record<string, PersistentScreenData>;
}

export class PersistentStorageManager {
  private static instance: PersistentStorageManager;
  private storageDir: string;
  private stateFile: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private currentState: PersistentSystemState;

  private constructor() {
    // Use unified AppData storage approach
    try {
      const paths = getCASNOSPaths();
      this.storageDir = paths.persistentPath;
      this.stateFile = paths.persistentStorageFile;
      console.log(`[PersistentStorage] 📁 Using unified path system: ${this.storageDir}`);
    } catch (error) {
      // Fallback to current directory
      console.log('[PersistentStorage] 🔄 Using fallback directory...');
      this.storageDir = path.join(process.cwd(), 'data', 'persistent');
      this.stateFile = path.join(this.storageDir, 'system-state.json');
      console.log(`[PersistentStorage] 📁 Fallback path: ${this.storageDir}`);
    }

    this.ensureDirectoryExists();
    this.currentState = this.loadInitialState();

    // Start auto-save every 5 seconds
    this.startAutoSave();
  }

  static getInstance(): PersistentStorageManager {
    if (!PersistentStorageManager.instance) {
      PersistentStorageManager.instance = new PersistentStorageManager();
    }
    return PersistentStorageManager.instance;
  }

  // ==================== SCREEN DATA MANAGEMENT ====================

  /**
   * حفظ بيانات شاشة معينة
   * Save data for a specific screen
   */
  saveScreenData(
    screenType: 'display' | 'window' | 'customer' | 'admin',
    deviceId: string,
    data: PersistentScreenData['data']
  ): void {
    const screenKey = `${screenType}_${deviceId}`;

    this.currentState.screens[screenKey] = {
      screenType,
      deviceId,
      timestamp: new Date().toISOString(),
      data
    };

    this.currentState.lastUpdate = new Date().toISOString();
    this.saveToFile();
  }

  /**
   * استرجاع بيانات شاشة معينة
   * Retrieve data for a specific screen
   */
  getScreenData(
    screenType: 'display' | 'window' | 'customer' | 'admin',
    deviceId: string
  ): PersistentScreenData['data'] | undefined {
    const screenKey = `${screenType}_${deviceId}`;
    const screenData = this.currentState.screens[screenKey];

    if (screenData && this.isDataFresh(screenData.timestamp)) {
      return screenData.data;
    }

    return undefined;
  }

  /**
   * حفظ البيانات العامة للنظام
   * Save global system data
   */
  saveGlobalData(globalData: Partial<PersistentSystemState['globalData']>): void {
    this.currentState.globalData = {
      ...this.currentState.globalData,
      ...globalData
    };
    this.currentState.lastUpdate = new Date().toISOString();
    this.saveToFile();
  }

  /**
   * استرجاع البيانات العامة للنظام
   * Get global system data
   */
  getGlobalData(): PersistentSystemState['globalData'] {
    return this.currentState.globalData;
  }

  // ==================== QUEUE SPECIFIC METHODS ====================

  /**
   * حفظ بيانات الطابور (للشاشات)
   * Save queue data for screens
   */
  saveQueueData(deviceId: string, queueData: any): void {
    // Save for display screens
    const existingDisplayData = this.getScreenData('display', deviceId) || {};
    this.saveScreenData('display', deviceId, {
      ...existingDisplayData,
      queueData: {
        pending: queueData.pending || [],
        total: queueData.total || 0,
        timestamp: queueData.timestamp || new Date().toISOString()
      }
    });

    // Also save for window screens that might need queue count
    const existingWindowData = this.getScreenData('window', deviceId) || {};
    this.saveScreenData('window', deviceId, {
      ...existingWindowData,
      queueData: {
        pending: queueData.pending || [],
        total: queueData.total || 0,
        timestamp: queueData.timestamp || new Date().toISOString()
      }
    });
  }

  /**
   * حفظ بيانات الاتصال
   * Save connection data
   */
  saveConnectionData(deviceId: string, serverInfo: any, deviceInfo: any): void {
    const screens = ['display', 'window', 'customer', 'admin'] as const;

    screens.forEach(screenType => {
      const existingData = this.getScreenData(screenType, deviceId) || {};
      this.saveScreenData(screenType, deviceId, {
        ...existingData,
        serverInfo: {
          ip: serverInfo.ip,
          port: serverInfo.port,
          connected: true
        },
        deviceInfo
      });
    });
  }

  /**
   * حفظ بيانات النافذة المحددة
   * Save selected window data
   */
  saveWindowData(deviceId: string, windowData: any, selectedService?: any): void {
    const existingData = this.getScreenData('window', deviceId) || {};
    this.saveScreenData('window', deviceId, {
      ...existingData,
      windowData,
      selectedService
    });
  }

  /**
   * حفظ بيانات الطابعة المحددة
   * Save selected printer data
   */
  savePrinterData(deviceId: string, selectedPrinter: any): void {
    const existingData = this.getScreenData('customer', deviceId) || {};
    this.saveScreenData('customer', deviceId, {
      ...existingData,
      selectedPrinter
    });
  }

  /**
   * حفظ طابور الصوت (للعرض)
   * Save audio queue for display
   */
  saveAudioQueue(deviceId: string, audioQueue: any[], currentAudioCall?: any): void {
    const existingData = this.getScreenData('display', deviceId) || {};
    this.saveScreenData('display', deviceId, {
      ...existingData,
      audioQueue,
      currentAudioCall
    });
  }

  // ==================== RECOVERY METHODS ====================

  /**
   * استرجاع جميع البيانات لجهاز معين
   * Recover all data for a specific device
   */
  recoverDeviceData(deviceId: string): {
    display?: PersistentScreenData['data'];
    window?: PersistentScreenData['data'];
    customer?: PersistentScreenData['data'];
    admin?: PersistentScreenData['data'];
  } {
    return {
      display: this.getScreenData('display', deviceId),
      window: this.getScreenData('window', deviceId),
      customer: this.getScreenData('customer', deviceId),
      admin: this.getScreenData('admin', deviceId)
    };
  }

  /**
   * تنظيف البيانات القديمة
   * Clean old data
   */
  cleanupOldData(): void {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    Object.keys(this.currentState.screens).forEach(screenKey => {
      const screenData = this.currentState.screens[screenKey];
      if (new Date(screenData.timestamp) < oneHourAgo) {
        delete this.currentState.screens[screenKey];
      }
    });

    this.saveToFile();
  }

  // ==================== INTERNAL METHODS ====================

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadInitialState(): PersistentSystemState {
    if (fs.existsSync(this.stateFile)) {
      try {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        const parsedState = JSON.parse(data) as PersistentSystemState;

        // تنظيف البيانات القديمة عند التحميل
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        Object.keys(parsedState.screens || {}).forEach(screenKey => {
          const screenData = parsedState.screens[screenKey];
          if (new Date(screenData.timestamp) < oneHourAgo) {
            delete parsedState.screens[screenKey];
          }
        });

        return parsedState;
      } catch (error) {
        // ملف تالف، إنشاء حالة جديدة
        return this.createInitialState();
      }
    }

    return this.createInitialState();
  }

  private createInitialState(): PersistentSystemState {
    return {
      lastUpdate: new Date().toISOString(),
      serverStatus: 'unknown',
      globalData: {
        services: [],
        windows: [],
        devices: [],
        printers: []
      },
      screens: {}
    };
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.currentState, null, 2));
    } catch (error) {
      console.error('[PersistentStorage] Failed to save state:', error);
    }
  }

  private startAutoSave(): void {
    // حفظ تلقائي كل 5 ثوانٍ
    this.autoSaveInterval = setInterval(() => {
      this.saveToFile();
    }, 5000);
  }

  private isDataFresh(timestamp: string): boolean {
    const dataTime = new Date(timestamp);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    return dataTime > oneHourAgo;
  }

  // ==================== LIFECYCLE METHODS ====================

  /**
   * إيقاف المدير
   * Shutdown the manager
   */
  shutdown(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // حفظ أخير
    this.saveToFile();
  }

  /**
   * إعادة تشغيل النظام (مسح جميع البيانات)
   * Reset system (clear all data)
   */
  resetSystem(): void {
    this.currentState = this.createInitialState();
    this.saveToFile();
  }

  /**
   * الحصول على إحصائيات التخزين
   * Get storage statistics
   */
  getStorageStats(): {
    totalScreens: number;
    dataSize: number;
    lastUpdate: string;
    screensBreakdown: Record<string, number>;
  } {
    const screensBreakdown: Record<string, number> = {};

    Object.values(this.currentState.screens).forEach(screen => {
      screensBreakdown[screen.screenType] = (screensBreakdown[screen.screenType] || 0) + 1;
    });

    return {
      totalScreens: Object.keys(this.currentState.screens).length,
      dataSize: JSON.stringify(this.currentState).length,
      lastUpdate: this.currentState.lastUpdate,
      screensBreakdown
    };
  }
}

// Export singleton instance
export const persistentStorage = PersistentStorageManager.getInstance();

export default PersistentStorageManager;
