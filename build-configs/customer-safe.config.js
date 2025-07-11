// 🔧 Customer Build Configuration - مؤقت لحل مشاكل البناء
// Temporary Customer Build Configuration - To fix build issues

const baseConfig = require('./base.config.js');

module.exports = {
  ...baseConfig,

  // Product information
  productName: "CASNOS-Customer",

  // Build settings
  appId: "com.casnos.customer",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",

  // Directories - مجلد مختلف مؤقتاً
  directories: {
    output: "dist/Customer-Safe",
    buildResources: "build"
  },

  // Files to include
  files: [
    "out/**/*",
    "resources/**/*",
    "package.json"
  ],

  // Extra resources (customer needs minimal resources)
  extraResources: [
    {
      from: "configs/customer-config.json",
      to: "screen-config.json"
    }
  ],

  // NSIS configuration مبسط
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "CASNOS Customer",
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico",
    deleteAppDataOnUninstall: false,
    displayLanguageSelector: false,
    language: "1025", // Arabic
    warningsAsErrors: false,  // ✅ تجاهل التحذيرات
    menuCategory: "CASNOS Queue Management",
    allowElevation: true,     // ✅ السماح بالرفع
    perMachine: true,         // ✅ تثبيت لكل المستخدمين
    runAfterFinish: false,    // ✅ عدم التشغيل بعد التثبيت
    differentialPackage: false // ✅ تعطيل التحديث التفاضلي
  },

  // Windows specific (portable only - no NSIS installer)
  win: {
    target: [
      {
        target: "portable",  // ✅ Only portable - no installer
        arch: ["ia32"]
      }
    ],
    icon: "build/icon.ico",
    requestedExecutionLevel: "requireAdministrator"
  },

  // ✅ Portable configuration
  portable: {
    requestExecutionLevel: "admin"
  },

  // ✅ إعدادات تحسين البناء
  compression: "normal",  // تقليل الضغط مؤقتاً

  // ✅ إعدادات الأمان
  forceCodeSigning: false,

  // ✅ إعدادات الأداء
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,

  // ✅ إعدادات إضافية
  fileAssociations: [],

  // Startup configuration
  protocols: [
    {
      name: "CASNOS Customer Protocol",
      schemes: ["casnos-customer"]
    }
  ]
};
