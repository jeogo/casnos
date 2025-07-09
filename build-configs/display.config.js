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

  // NSIS configuration (Windows)
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "CASNOS Display",
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico",
    installerHeader: "build/icon.png",
    installerHeaderIcon: "build/icon.ico",
    deleteAppDataOnUninstall: false,
    displayLanguageSelector: false,
    language: "1025", // Arabic
    warningsAsErrors: false,
    menuCategory: "CASNOS Queue Management"
  },

  // Windows specific
  win: {
    target: [
      {
        target: "portable",  // Build portable executable
        arch: ["x64", "ia32"]  // Support both 64-bit and 32-bit
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "asInvoker",
    // Disable signing to prevent build errors
    sign: false,
    // Disable signature verification
    signAndEditExecutable: false
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Display Protocol",
      schemes: ["casnos-display"]
    }
  ]
};
