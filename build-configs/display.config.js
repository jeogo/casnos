// 📺 Display Screen Build Configuration
// تكوين بناء شاشة العرض مع الخادم المدمج

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS-Display",

  // Build settings
  appId: "com.casnos.display",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Directories
  directories: {
    output: "dist/Display",
    buildResources: "build"
  },

  // Files to include
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json"
  ],

  // Extra resources (display needs FULL resources for complete functionality)
  extraResources: [
    {
      from: "configs/display-config.json",
      to: "screen-config.json"
    },
    {
      from: "dist-server",
      to: "server"
    },
    {
      from: "resources/fonts",
      to: "fonts"
    },
    {
      from: "resources/voice",
      to: "voice"
    },
    {
      from: "resources/video",
      to: "video"
    },
    {
      from: "resources/assets",
      to: "assets"
    },
    {
      from: "resources/assets/SumatraPDF.exe",
      to: "assets/SumatraPDF.exe"
    },
    {
      from: "resources/assets/SumatraPDF-settings.txt",
      to: "assets/SumatraPDF-settings.txt"
    },
    {
      from: "resources/assets/logo.png",
      to: "assets/logo.png"
    },
    {
      from: "build/icon.png",
      to: "icon.png"
    }
    // ✅ FULL RESOURCES: Display needs everything including SumatraPDF for printing
  ],

  // Windows specific (portable only - avoids NSIS issues)
  win: {
    target: [
      {
        target: "portable",  // ✅ Only portable - no installer
        arch: ["x64"]
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "requireAdministrator" // ✅ Run as Administrator for server operations
  },

  // ✅ Portable configuration
  portable: {
    artifactName: "${productName}-${version}-portable-64bit.${ext}",
    unpackDirName: "CASNOS-Display",
    requestExecutionLevel: "admin"  // ✅ Run as Admin in portable mode
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Display Protocol",
      schemes: ["casnos-display"]
    }
  ]
};
