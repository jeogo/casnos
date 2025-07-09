// 🚀 Embedded Server Manager - مدير الخادم المدمج
// يدير تشغيل وإيقاف الخادم المدمج مع شاشة العرض

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { screenDetectionManager, ScreenConfiguration } from '../config/screenDetection';
import { ResourcePathManager } from '../utils/resourcePathManager';

export interface ServerStatus {
  isRunning: boolean;
  pid?: number;
  port?: number;
  startTime?: Date;
  restartCount: number;
  lastError?: string;
}

export class EmbeddedServerManager {
  private static instance: EmbeddedServerManager;
  private serverProcess: ChildProcess | null = null;
  private config: ScreenConfiguration | null = null;
  private status: ServerStatus = {
    isRunning: false,
    restartCount: 0
  };
  private restartTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): EmbeddedServerManager {
    if (!EmbeddedServerManager.instance) {
      EmbeddedServerManager.instance = new EmbeddedServerManager();
    }
    return EmbeddedServerManager.instance;
  }

  /**
   * بدء تشغيل الخادم المدمج
   */
  public async startServer(): Promise<boolean> {
    try {
      this.config = screenDetectionManager.loadConfiguration();

      // التحقق من ضرورة تشغيل الخادم
      if (!this.config.embeddedServer.enabled) {
        console.log('[EMBEDDED-SERVER] 🚫 Server is disabled in configuration');
        return false;
      }

      // التحقق من وجود الخادم
      const serverPath = this.getServerPath();
      if (!existsSync(serverPath)) {
        console.error(`[EMBEDDED-SERVER] ❌ Server file not found: ${serverPath}`);
        this.status.lastError = `Server file not found: ${serverPath}`;
        return false;
      }

      // إيقاف الخادم إذا كان يعمل
      if (this.serverProcess) {
        await this.stopServer();
      }

      console.log('[EMBEDDED-SERVER] 🚀 Starting embedded server...');
      console.log(`[EMBEDDED-SERVER] 📂 Server path: ${serverPath}`);
      console.log(`[EMBEDDED-SERVER] 🌐 Port: ${this.config.embeddedServer.port}`);

      // بدء تشغيل الخادم - استخدام executable في Production أو Node.js في Development
      if (this.isServerExecutable()) {
        // تشغيل الخادم كملف تنفيذي مستقل
        this.serverProcess = spawn(serverPath, [], {
          cwd: this.getServerWorkingDirectory(),
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: this.config.embeddedServer.port.toString(),
            HOST: this.config.embeddedServer.host
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        // تشغيل الخادم باستخدام Node.js
        this.serverProcess = spawn('node', [serverPath], {
          cwd: this.getServerWorkingDirectory(),
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: this.config.embeddedServer.port.toString(),
            HOST: this.config.embeddedServer.host
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }

      // معالجة أحداث الخادم
      this.setupServerEventHandlers();

      // تحديث الحالة
      this.status = {
        isRunning: true,
        pid: this.serverProcess.pid,
        port: this.config.embeddedServer.port,
        startTime: new Date(),
        restartCount: this.status.restartCount,
        lastError: undefined
      };

      console.log(`[EMBEDDED-SERVER] ✅ Server started successfully (PID: ${this.serverProcess.pid})`);

      // انتظار قصير للتأكد من عدم انهيار الخادم فوراً
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!this.status.isRunning) {
        throw new Error('Server failed to start properly');
      }

      return true;

    } catch (error) {
      console.error('[EMBEDDED-SERVER] ❌ Failed to start server:', error);
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.status.isRunning = false;
      return false;
    }
  }

  /**
   * إيقاف الخادم المدمج
   */
  public async stopServer(): Promise<void> {
    if (!this.serverProcess) {
      console.log('[EMBEDDED-SERVER] 🚫 No server process to stop');
      return;
    }

    return new Promise((resolve) => {
      console.log('[EMBEDDED-SERVER] 🛑 Stopping embedded server...');

      const cleanup = () => {
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = null;
        }
        this.serverProcess = null;
        this.status.isRunning = false;
        this.status.pid = undefined;
        console.log('[EMBEDDED-SERVER] ✅ Server stopped successfully');
        resolve();
      };

      if (this.serverProcess) {
        this.serverProcess.once('exit', cleanup);

        // محاولة إيقاف لطيف
        this.serverProcess.kill('SIGTERM');

        // إيقاف قسري إذا لم يتوقف خلال 5 ثوانِ
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            console.log('[EMBEDDED-SERVER] ⚠️ Force killing server process');
            this.serverProcess.kill('SIGKILL');
          }
        }, 5000);
      } else {
        cleanup();
      }
    });
  }

  /**
   * إعادة تشغيل الخادم
   */
  public async restartServer(): Promise<boolean> {
    console.log('[EMBEDDED-SERVER] 🔄 Restarting server...');
    await this.stopServer();

    if (this.config?.embeddedServer.restartDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config!.embeddedServer.restartDelay!));
    }

    this.status.restartCount++;
    return await this.startServer();
  }

  /**
   * فحص صحة الخادم
   */
  public async checkServerHealth(): Promise<boolean> {
    if (!this.status.isRunning || !this.serverProcess) {
      return false;
    }

    try {
      // محاولة الاتصال بالخادم
      const response = await fetch(`http://localhost:${this.status.port}/`);
      return response.ok;
    } catch (error) {
      console.warn('[EMBEDDED-SERVER] ⚠️ Server health check failed:', error);
      return false;
    }
  }

  /**
   * الحصول على حالة الخادم
   */
  public getServerStatus(): ServerStatus {
    return { ...this.status };
  }

  /**
   * إعداد معالجات أحداث الخادم
   */
  private setupServerEventHandlers(): void {
    if (!this.serverProcess) return;

    // معالجة الإخراج
    this.serverProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[EMBEDDED-SERVER] 📝 ${message}`);
      }
    });

    // معالجة الأخطاء
    this.serverProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[EMBEDDED-SERVER] ❌ ${message}`);
        this.status.lastError = message;
      }
    });

    // معالجة انهيار الخادم
    this.serverProcess.on('exit', (code, signal) => {
      console.log(`[EMBEDDED-SERVER] 🔚 Server process exited (code: ${code}, signal: ${signal})`);
      this.status.isRunning = false;
      this.status.pid = undefined;

      // إعادة التشغيل التلقائي
      if (this.shouldAutoRestart(code)) {
        this.scheduleRestart();
      }
    });

    this.serverProcess.on('error', (error) => {
      console.error('[EMBEDDED-SERVER] 💥 Server process error:', error);
      this.status.lastError = error.message;
      this.status.isRunning = false;
    });
  }

  /**
   * هل يجب إعادة التشغيل التلقائي؟
   */
  private shouldAutoRestart(exitCode: number | null): boolean {
    if (!this.config?.embeddedServer.autoRestart) {
      return false;
    }

    const maxAttempts = this.config.embeddedServer.maxRestartAttempts || 3;
    if (this.status.restartCount >= maxAttempts) {
      console.log(`[EMBEDDED-SERVER] 🚫 Max restart attempts reached (${maxAttempts})`);
      return false;
    }

    // إعادة التشغيل فقط في حالة الانهيار غير المتوقع
    return exitCode !== 0;
  }

  /**
   * جدولة إعادة التشغيل
   */
  private scheduleRestart(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    const delay = this.config?.embeddedServer.restartDelay || 5000;
    console.log(`[EMBEDDED-SERVER] ⏱️ Scheduling restart in ${delay}ms...`);

    this.restartTimeout = setTimeout(async () => {
      console.log('[EMBEDDED-SERVER] 🔄 Auto-restarting server...');
      await this.restartServer();
    }, delay);
  }

  /**
   * الحصول على مسار الخادم
   */
  private getServerPath(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // في Development - استخدام الخادم المبني في dist-server
      return join(__dirname, '../../../dist-server', 'server.js');
    } else {
      // في Production - استخدام الخادم المجمع من resources
      const resourceManager = ResourcePathManager.getInstance();
      const serverExecutable = this.config?.paths?.serverExecutable || 'server.js';
      return join(resourceManager.getResourcesPath(), serverExecutable);
    }
  }

  /**
   * التحقق من نوع الخادم (Node.js أم executable)
   */
  private isServerExecutable(): boolean {
    const serverPath = this.getServerPath();
    return serverPath.endsWith('.exe') || serverPath.endsWith('.bin');
  }

  /**
   * الحصول على مجلد عمل الخادم
   */
  private getServerWorkingDirectory(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return join(__dirname, '../../../dist-server');
    } else {
      const resourceManager = ResourcePathManager.getInstance();
      return resourceManager.getResourcesPath();
    }
  }

  /**
   * تنظيف الموارد
   */
  public async cleanup(): Promise<void> {
    console.log('[EMBEDDED-SERVER] 🧹 Cleaning up...');

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    await this.stopServer();
  }
}

// تصدير مثيل واحد
export const embeddedServerManager = EmbeddedServerManager.getInstance();
