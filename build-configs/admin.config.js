// ⚙️ Admin Screen Build Configuration
// تكوين بناء شاشة الإدارة

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS-Admin",

  // Build settings
  appId: "com.casnos.admin",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Extra metadata
  extraMetadata: {
    description: "Administration and Control Panel"
  },

  // Directories
  directories: {
    output: "dist/Admin",
    buildResources: "build"
  },

  // Files to include (no server files)
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json",
    "!dist-server/**/*" // exclude server files
  ],

  // Extra resources (minimal for admin - only fonts, assets, and logo)
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
      from: "configs/admin-config.json",
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
    requestedExecutionLevel: "requireAdministrator" // ✅ Run as Administrator for admin operations
  },

  // ✅ Portable configuration
  portable: {
    artifactName: "${productName}-${version}-portable-64bit.${ext}",
    unpackDirName: "CASNOS-Admin",
    requestExecutionLevel: "admin"  // ✅ Run as Admin in portable mode
  },

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Admin Protocol",
      schemes: ["casnos-admin"]
    }
  ]
};
