import { BrowserWindow } from 'electron';

class EmbeddedServerManager {
  private httpServer: any = null;
  private app: any = null;
  private io: any = null;
  private isRunning = false;

  async startServer(mainWindow?: BrowserWindow): Promise<void> {
    if (this.isRunning) {
      console.log('🟡 Server is already running');
      return;
    }

    try {
      console.log('🚀 Starting embedded server...');

      // استيراد الخادم مباشرة من المجلد المدمج
      const { app, httpServer, io, startServer } = await import('../embedded-server/server');

      // تشغيل الخادم
      await startServer();

      // حفظ مراجع الخادم
      this.app = app;
      this.httpServer = httpServer;
      this.io = io;

      this.isRunning = true;
      console.log('✅ Embedded server started successfully on port 3001');

      // إشعار النافذة الرئيسية بأن الخادم بدأ
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-started');
      }

    } catch (error) {
      console.error('❌ Failed to start embedded server:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopServer(): Promise<void> {
    if (!this.isRunning) {
      console.log('🟡 Server is not running');
      return;
    }

    try {
      console.log('🛑 Stopping embedded server...');

      if (this.httpServer && typeof this.httpServer.close === 'function') {
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.httpServer = null;
      this.app = null;
      this.io = null;
      this.isRunning = false;
      console.log('✅ Embedded server stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping embedded server:', error);
      this.isRunning = false;
    }
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getServerInstance(): any {
    return {
      app: this.app,
      httpServer: this.httpServer,
      io: this.io
    };
  }
}

// إنشاء instance واحد للاستخدام عبر التطبيق
export const embeddedServerManager = new EmbeddedServerManager();
export default embeddedServerManager;
