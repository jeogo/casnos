// 🏢 Base Build Configuration
// التكوين الأساسي المشترك لجميع الشاشات

const { join } = require('path');

module.exports = {
  // Basic app information
  appId: "com.casnos.app",
  productName: "CASNOS",

  // Base directories
  directories: {
    buildResources: "build",
    output: "dist"
  },

  // Base files to include
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json",
    "!**/node_modules/**/*",
    "!src/**/*",
    "!test/**/*",
    "!**/*.map",
    "!**/*.ts"
  ],

  // Base extra resources
  extraResources: [
    {
      from: "resources/fonts",
      to: "fonts"
    },
    {
      from: "build/icon.png",
      to: "icon.png"
    }
  ],

  // Compression
  compression: "normal",

  // Base Windows configuration (portable only - avoids NSIS issues)
  win: {
    target: [
      {
        target: "portable",  // ✅ Only portable - no installer
        arch: ["x64"]
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "requireAdministrator" // ✅ Default to Administrator for all builds
  },

  // Base Mac configuration
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      }
    ],
    icon: "build/icon.icns",
    category: "public.app-category.business"
  },

  // Base Linux configuration
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"]
      }
    ],
    icon: "build/icon.png",
    category: "Office"
  },
    // Metadata
  copyright: "Copyright © 2025 CASNOS Team",

  // Publish configuration (for auto-updater)
  publish: null, // Disable auto-publish

  // Build options - تعطيل بناء Native Modules (حل مشكلة Visual Studio)
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  npmRebuild: false,

  // إضافة إعدادات إضافية لتجنب مشاكل Native Modules
  afterPack: async (context) => {
    // تجنب إعادة بناء Native modules
    console.log('✅ Skipping native modules rebuild for compatibility');
  },

  // ✅ Portable configuration
  portable: {
    requestExecutionLevel: "admin"  // ✅ Run as Admin in portable mode
  }
};
