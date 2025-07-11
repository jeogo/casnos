// 👥 Customer Screen Build Configuration
// تكوين بناء شاشة العملاء

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS-Customer",

  // Build settings
  appId: "com.casnos.customer",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Extra metadata
  extraMetadata: {
    description: "Customer Ticket Creation System"
  },

  // Directories
  directories: {
    output: "dist/Customer",
    buildResources: "build"
  },

  // Files to include (no server files)
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json",
    "!dist-server/**/*" // exclude server files
  ],

  // Extra resources (minimal for customer kiosk - only fonts, assets, and logo)
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
      from: "configs/customer-config.json",
      to: "screen-config.json"
    }
  ],

  // Portable configuration (no installation required)
  portable: {
    artifactName: "${productName}-${version}-portable-32bit.${ext}",
    unpackDirName: "CASNOS-Customer",  // ✅ Fixed: Use actual name instead of variable
    requestExecutionLevel: "admin" // ✅ Run portable version as Admin too
  },

  // Windows specific (portable only - avoids NSIS issues)
  win: {
    target: [
      {
        target: "portable",  // ✅ Only portable - no installer
        arch: ["ia32"] // ✅ 32-bit architecture for customer kiosks
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "requireAdministrator" // ✅ Run as Administrator for faster data access
  },

  // إعدادات إضافية لتجنب مشاكل Node-gyp
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  npmRebuild: false,

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Customer Protocol",
      schemes: ["casnos-customer"]
    }
  ]
};
