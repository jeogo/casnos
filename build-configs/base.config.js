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

  // Base NSIS options
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico",
    deleteAppDataOnUninstall: false,
    displayLanguageSelector: false,
    language: "1025", // Arabic
    warningsAsErrors: false,
    menuCategory: "CASNOS Queue Management"
  },

  // Base Windows configuration
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "asInvoker",
    // Disable signing to prevent build errors
    sign: false,
    // Disable signature verification
    signAndEditExecutable: false
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

  // Build options
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  npmRebuild: false,

  // Disable signing and metadata modification to prevent build errors
  afterSign: null,
  afterAllArtifactBuild: null,

  // Prevent rcedit issues
  electronVersion: undefined, // Use default electron version

  // Metadata configuration
  buildVersion: "1.0.0"
};
