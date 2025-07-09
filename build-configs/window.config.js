// 🪟 Window Screen Build Configuration
// تكوين بناء شاشة الشباك

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS Window Terminal",
  description: "محطة شباك الخدمة للموظفين",

  // Build settings
  appId: "com.casnos.window",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Directories
  directories: {
    output: "dist/Window",
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

  // Extra resources (minimal for window terminal - no audio/video)
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
      from: "configs/window-config.json",
      to: "screen-config.json"
    }
  ],
    // NSIS configuration
  nsis: {
    ...baseConfig.nsis,
    shortcutName: "CASNOS Window"
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Window Protocol",
      schemes: ["casnos-window"]
    }
  ]
};
