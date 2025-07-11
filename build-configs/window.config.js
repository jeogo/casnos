// 🪟 Window Screen Build Configuration
// تكوين بناء شاشة الشباك

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS-Window",

  // Build settings
  appId: "com.casnos.window",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Extra metadata
  extraMetadata: {
    description: "Window Service Terminal for Employees"
  },

  // Directories
  directories: {
    output: "dist/Window",
    buildResources: "build"
  },

  // Files to include (no server files)
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json",
    "!dist-server/**/*" // exclude server files
  ],

  // Extra resources (minimal for window terminal - only fonts, assets, and logo)
  extraResources: [
    {
      from: "resources/fonts",
      to: "fonts"
    },
    {
      from: "resources/assets",
      to: "assets"
    },
    {
      from: "resources/assets/logo.png",
      to: "assets/logo.png"
    },
    {
      from: "configs/window-config.json",
      to: "screen-config.json"
    }
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
    requestedExecutionLevel: "requireAdministrator" // ✅ Run as Administrator for window operations
  },

  // ✅ Portable configuration
  portable: {
    artifactName: "${productName}-${version}-portable-64bit.${ext}",
    unpackDirName: "CASNOS-Window",
    requestExecutionLevel: "admin"  // ✅ Run as Admin in portable mode
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Window Protocol",
      schemes: ["casnos-window"]
    }
  ]
};
