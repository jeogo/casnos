// 🎯 Screen Optimization Configuration
// تكوين تحسين الشاشات - تحميل الخدمات المطلوبة فقط لكل نوع شاشة

export interface ScreenConfig {
  // Core services (always required)
  networkHandlers: boolean;
  udpDiscovery: boolean;

  // Optional services based on screen type
  printHandlers: boolean;
  audioHandlers: boolean;
  windowHandlers: boolean;

  // Performance settings
  serverSyncInterval: number; // milliseconds
  enableDevTools: boolean;

  // Memory optimization
  maxMemoryUsage: number; // MB
  garbageCollectionInterval: number; // milliseconds
}

// 📊 Screen-specific configurations
export const SCREEN_CONFIGS: Record<string, ScreenConfig> = {
  // 🖥️ Display Screen - Needs audio, printing, real-time updates
  display: {
    networkHandlers: true,
    udpDiscovery: true,
    printHandlers: true, // For network printing
    audioHandlers: true, // For announcements
    windowHandlers: false, // Not needed
    serverSyncInterval: 2000, // Fast sync for real-time
    enableDevTools: process.env.NODE_ENV === 'development',
    maxMemoryUsage: 256, // MB
    garbageCollectionInterval: 30000 // 30 seconds
  },

  // 👥 Customer Screen - Needs printing, minimal services
  customer: {
    networkHandlers: true,
    udpDiscovery: true,
    printHandlers: true, // For ticket printing
    audioHandlers: false, // Not needed
    windowHandlers: false, // Not needed
    serverSyncInterval: 5000, // Moderate sync
    enableDevTools: process.env.NODE_ENV === 'development',
    maxMemoryUsage: 128, // MB - Lightweight
    garbageCollectionInterval: 60000 // 1 minute
  },

  // 👨‍💼 Employee Screen - Needs minimal services
  employee: {
    networkHandlers: true,
    udpDiscovery: true,
    printHandlers: false, // Usually not needed
    audioHandlers: false, // Not needed
    windowHandlers: false, // Not needed
    serverSyncInterval: 3000, // Fast for ticket management
    enableDevTools: process.env.NODE_ENV === 'development',
    maxMemoryUsage: 128, // MB - Lightweight
    garbageCollectionInterval: 45000 // 45 seconds
  },

  // 🛡️ Admin Screen - Needs all services for management
  admin: {
    networkHandlers: true,
    udpDiscovery: true,
    printHandlers: true, // For system management
    audioHandlers: false, // Not needed
    windowHandlers: true, // For window management
    serverSyncInterval: 5000, // Moderate sync for admin tasks
    enableDevTools: process.env.NODE_ENV === 'development',
    maxMemoryUsage: 256, // MB - More memory for admin tasks
    garbageCollectionInterval: 60000 // 1 minute
  },

  // 🔄 Default/All Screens Mode
  all: {
    networkHandlers: true,
    udpDiscovery: true,
    printHandlers: true,
    audioHandlers: true,
    windowHandlers: true,
    serverSyncInterval: 5000,
    enableDevTools: process.env.NODE_ENV === 'development',
    maxMemoryUsage: 512, // MB - Higher for all services
    garbageCollectionInterval: 30000 // 30 seconds
  }
};

// 🎯 Get configuration for current screen mode
export function getScreenConfig(screenMode?: string): ScreenConfig {
  const mode = screenMode || 'all';
  const config = SCREEN_CONFIGS[mode];

  if (!config) {
    return SCREEN_CONFIGS.all;
  }

  // Using optimized config for screen
  return config;
}

// 🚀 Performance optimization functions
export function setupMemoryOptimization(config: ScreenConfig) {
  // Set memory limits
  if (process.memoryUsage) {
    const memoryLimit = config.maxMemoryUsage * 1024 * 1024; // Convert MB to bytes

    // Periodic memory check and garbage collection
    setInterval(() => {
      const usage = process.memoryUsage();

      // Force garbage collection if over 80% of limit
      if (usage.heapUsed > memoryLimit * 0.8) {
        if (global.gc) {
          global.gc();
        }
      }
    }, config.garbageCollectionInterval);
  }
}

// 📝 Log optimization status
export function logOptimizationStatus(_screenMode: string, _config: ScreenConfig) {
  // Optimization status logged
}
