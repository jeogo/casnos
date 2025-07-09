// 👥 Customer Screen Build Configuration
// تكوين بناء شاشة العملاء

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS Customer Kiosk",
  description: "نظام العملاء لإنشاء تذاكر",

  // Build settings
  appId: "com.casnos.customer",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Directories
  directories: {
    output: "dist/Customer",
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

  // Extra resources (minimal for customer kiosk - no audio/video)
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
      from: "configs/customer-config.json",
      to: "screen-config.json"
    }
  ],

  // NSIS configuration
  nsis: {
    ...baseConfig.nsis,
    shortcutName: "CASNOS Customer"
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Customer Protocol",
      schemes: ["casnos-customer"]
    }
  ]
};
