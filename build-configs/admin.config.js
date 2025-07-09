// ⚙️ Admin Screen Build Configuration
// تكوين بناء شاشة الإدارة

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS Admin Panel",
  description: "لوحة الإدارة والتحكم في النظام",

  // Build settings
  appId: "com.casnos.admin",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Directories
  directories: {
    output: "dist/Admin",
    buildResources: "build"
  },

  // Files to include (no server files, video, or voice)
  files: [
    "out/**/*",
    "resources/fonts/**/*",
    "resources/assets/logo.png",
    "resources/assets/SumatraPDF.exe",
    "resources/assets/SumatraPDF-settings.txt",
    "package.json",
    "!dist-server/**/*", // exclude server files
    "!resources/video/**/*", // exclude video files
    "!resources/voice/**/*" // exclude voice files
  ],

  // Extra resources (essential resources for admin - no audio/video)
  extraResources: [
    {
      from: "resources/fonts",
      to: "fonts"
    },
    {
      from: "resources/assets/logo.png",
      to: "assets/logo.png"
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
      from: "build/icon.png",
      to: "icon.png"
    },
    {
      from: "configs/admin-config.json",
      to: "screen-config.json"
    }
  ],
    // NSIS configuration
  nsis: {
    ...baseConfig.nsis,
    shortcutName: "CASNOS Admin",
    createDesktopShortcut: "always",
    runAfterFinish: false // Don't auto-run admin panel
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Admin Protocol",
      schemes: ["casnos-admin"]
    }
  ]
};
