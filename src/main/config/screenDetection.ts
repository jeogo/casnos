// 🎯 Screen Detection Manager - مدير كشف نوع الشاشة
// يحدد نوع الشاشة من ملف JSON أو متغيرات البيئة

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export interface ScreenConfiguration {
  version: string;
  screenType: 'display' | 'customer' | 'window' | 'admin';
  embeddedServer: {
    enabled: boolean;
    port: number;
    host: string;
    autoRestart?: boolean;
    maxRestartAttempts?: number;
    restartDelay?: number;
    autoConnect?: boolean;
  };
  features: {
    audio: boolean;
    video: boolean;
    printing: boolean;
    udpDiscovery: boolean;
    realTimeUpdates: boolean;
    socketIO: boolean;
    windowManagement?: boolean;
  };
  performance: {
    maxMemoryUsage: number;
    garbageCollectionInterval: number;
    serverSyncInterval: number;
    enableDevTools: boolean;
  };
  paths: {
    serverExecutable?: string;
    videoPath?: string;
    voicePath?: string;
    fontsPath?: string;
  };
}

export class ScreenDetectionManager {
  private static instance: ScreenDetectionManager;
  private currentConfig: ScreenConfiguration | null = null;

  private constructor() {}

  public static getInstance(): ScreenDetectionManager {
    if (!ScreenDetectionManager.instance) {
      ScreenDetectionManager.instance = new ScreenDetectionManager();
    }
    return ScreenDetectionManager.instance;
  }

  /**
   * الحصول على مسار ملف التكوين
   */
  private getConfigPath(screenType?: string): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // في Development - قراءة من مجلد configs
      const configFileName = screenType ? `${screenType}-config.json` : 'display-config.json';
      return join(process.cwd(), 'configs', configFileName);
    } else {
      // في Production - قراءة من resources
      return join(process.resourcesPath, 'screen-config.json');
    }
  }

  /**
   * كشف نوع الشاشة من مصادر متعددة
   */
  private detectScreenType(): string {
    // 1. متغير البيئة (أولوية عالية)
    if (process.env.SCREEN_MODE) {
      console.log(`[SCREEN-DETECTION] 🎯 Screen type from environment: ${process.env.SCREEN_MODE}`);
      return process.env.SCREEN_MODE;
    }

    // 2. اسم المنتج من package.json
    try {
      const packagePath = join(process.cwd(), 'package.json');
      if (existsSync(packagePath)) {
        const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
        const productName = packageData.productName || packageData.name || '';

        if (productName.toLowerCase().includes('display')) return 'display';
        if (productName.toLowerCase().includes('customer')) return 'customer';
        if (productName.toLowerCase().includes('window')) return 'window';
        if (productName.toLowerCase().includes('admin')) return 'admin';
      }
    } catch (error) {
      // Silent error handling
    }

    // 3. اسم الملف التنفيذي
    const executableName = process.execPath.toLowerCase();
    if (executableName.includes('display')) return 'display';
    if (executableName.includes('customer')) return 'customer';
    if (executableName.includes('window')) return 'window';
    if (executableName.includes('admin')) return 'admin';

    // 4. الافتراضي
    console.log('[SCREEN-DETECTION] ⚠️ Using default screen type: display');
    return 'display';
  }

  /**
   * تحميل تكوين الشاشة
   */
  public loadConfiguration(): ScreenConfiguration {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    const screenType = this.detectScreenType();
    const configPath = this.getConfigPath(screenType);

    console.log(`[SCREEN-DETECTION] 📋 Loading config for ${screenType} from: ${configPath}`);

    try {
      if (existsSync(configPath)) {
        const configData = readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData) as ScreenConfiguration;

        // التحقق من صحة التكوين
        if (this.validateConfiguration(config)) {
          this.currentConfig = config;
          console.log(`[SCREEN-DETECTION] ✅ Configuration loaded successfully for ${config.screenType}`);
          return config;
        } else {
          console.error('[SCREEN-DETECTION] ❌ Invalid configuration, using default');
        }
      } else {
        console.warn(`[SCREEN-DETECTION] ⚠️ Config file not found: ${configPath}`);
      }
    } catch (error) {
      console.error('[SCREEN-DETECTION] ❌ Error loading configuration:', error);
    }

    // العودة للإعدادات الافتراضية
    const defaultConfig = this.getDefaultConfiguration(screenType as any);
    this.currentConfig = defaultConfig;
    return defaultConfig;
  }

  /**
   * التحقق من صحة التكوين
   */
  private validateConfiguration(config: any): config is ScreenConfiguration {
    return (
      config &&
      typeof config.version === 'string' &&
      typeof config.screenType === 'string' &&
      ['display', 'customer', 'window', 'admin'].includes(config.screenType) &&
      config.embeddedServer &&
      typeof config.embeddedServer.enabled === 'boolean' &&
      config.features &&
      config.performance
    );
  }

  /**
   * الحصول على التكوين الافتراضي
   */
  private getDefaultConfiguration(screenType: 'display' | 'customer' | 'window' | 'admin'): ScreenConfiguration {
    const baseConfig: ScreenConfiguration = {
      version: '1.0.0',
      screenType,
      embeddedServer: {
        enabled: screenType === 'display',
        port: 3001,
        host: '0.0.0.0',
        autoRestart: true,
        maxRestartAttempts: 3,
        restartDelay: 5000
      },
      features: {
        audio: screenType === 'display',
        video: screenType === 'display',
        printing: ['display', 'customer', 'admin'].includes(screenType),
        udpDiscovery: true,
        realTimeUpdates: ['display', 'window', 'admin'].includes(screenType),
        socketIO: true
      },
      performance: {
        maxMemoryUsage: screenType === 'display' ? 256 : 128,
        garbageCollectionInterval: screenType === 'display' ? 30000 : 60000,
        serverSyncInterval: screenType === 'display' ? 2000 : 5000,
        enableDevTools: process.env.NODE_ENV === 'development'
      },
      paths: {
        serverExecutable: 'server/server.js',
        videoPath: 'video/ads.mp4',
        voicePath: 'voice/',
        fontsPath: 'fonts/'
      }
    };

    return baseConfig;
  }

  /**
   * الحصول على التكوين الحالي
   */
  public getCurrentConfiguration(): ScreenConfiguration | null {
    return this.currentConfig;
  }

  /**
   * هل يجب تشغيل الخادم المدمج؟
   */
  public shouldStartEmbeddedServer(): boolean {
    const config = this.getCurrentConfiguration() || this.loadConfiguration();
    return config.embeddedServer.enabled;
  }

  /**
   * الحصول على نوع الشاشة
   */
  public getScreenType(): string {
    const config = this.getCurrentConfiguration() || this.loadConfiguration();
    return config.screenType;
  }
}

// تصدير مثيل واحد
export const screenDetectionManager = ScreenDetectionManager.getInstance();
