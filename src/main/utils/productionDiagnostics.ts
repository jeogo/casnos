/**
 * 🔍 Production Diagnostics Utility
 * أداة تشخيص الإنتاج للتحقق من المسارات والموارد
 */

import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface ProductionDiagnosticsReport {
  environment: 'development' | 'production';
  appPackaged: boolean;
  paths: {
    cwd: string;
    resourcesPath?: string;
    userData: string;
    appPath: string;
  };
  resources: {
    sumatraPDF: {
      found: boolean;
      path?: string;
      paths_checked: string[];
    };
    logo: {
      found: boolean;
      path?: string;
      paths_checked: string[];
    };
    fonts: {
      found: boolean;
      path?: string;
      paths_checked: string[];
    };
  };
  storage: {
    pdfStorage: {
      path: string;
      exists: boolean;
      writable: boolean;
    };
    tempStorage: {
      path: string;
      exists: boolean;
      writable: boolean;
    };
  };
}

/**
 * Run complete production diagnostics
 */
export function runProductionDiagnostics(): ProductionDiagnosticsReport {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Basic paths
  const cwd = process.cwd();
  const resourcesPath = process.resourcesPath;
  const userData = app.getPath('userData');
  const appPath = app.getAppPath();

  const report: ProductionDiagnosticsReport = {
    environment: isDev ? 'development' : 'production',
    appPackaged: app.isPackaged,
    paths: {
      cwd,
      resourcesPath,
      userData,
      appPath
    },
    resources: {
      sumatraPDF: checkSumatraPDF(isDev, resourcesPath, cwd),
      logo: checkLogo(isDev, resourcesPath, cwd),
      fonts: checkFonts(isDev, resourcesPath, cwd)
    },
    storage: {
      pdfStorage: checkStorage(path.join(userData, 'tickets')),
      tempStorage: checkStorage(path.join(userData, 'tickets', 'temp'))
    }
  };

  return report;
}

function checkSumatraPDF(isDev: boolean, resourcesPath?: string, cwd?: string) {
  const paths_checked: string[] = [];

  if (isDev) {
    paths_checked.push(
      path.join(cwd || '', 'resources', 'assets', 'SumatraPDF.exe'),
      path.join(__dirname, '../../../resources/assets/SumatraPDF.exe')
    );
  } else {
    if (resourcesPath) {
      paths_checked.push(
        path.join(resourcesPath, 'assets', 'SumatraPDF.exe'),
        path.join(resourcesPath, 'SumatraPDF.exe')
      );
    }
    if (cwd) {
      paths_checked.push(
        path.join(cwd, 'resources', 'assets', 'SumatraPDF.exe'),
        path.join(cwd, 'assets', 'SumatraPDF.exe')
      );
    }
  }

  for (const checkPath of paths_checked) {
    if (fs.existsSync(checkPath)) {
      return {
        found: true,
        path: checkPath,
        paths_checked
      };
    }
  }

  return {
    found: false,
    paths_checked
  };
}

function checkLogo(isDev: boolean, resourcesPath?: string, cwd?: string) {
  const paths_checked: string[] = [];

  if (isDev) {
    paths_checked.push(
      path.join(cwd || '', 'resources', 'assets', 'logo.png'),
      path.join(cwd || '', 'resources', 'logo.png'),
      path.join(__dirname, '../../../resources/assets/logo.png')
    );
  } else {
    if (resourcesPath) {
      paths_checked.push(
        path.join(resourcesPath, 'assets', 'logo.png'),
        path.join(resourcesPath, 'logo.png')
      );
    }
    if (cwd) {
      paths_checked.push(
        path.join(cwd, 'resources', 'assets', 'logo.png'),
        path.join(cwd, 'assets', 'logo.png')
      );
    }
  }

  for (const checkPath of paths_checked) {
    if (fs.existsSync(checkPath)) {
      return {
        found: true,
        path: checkPath,
        paths_checked
      };
    }
  }

  return {
    found: false,
    paths_checked
  };
}

function checkFonts(isDev: boolean, resourcesPath?: string, cwd?: string) {
  const paths_checked: string[] = [];

  if (isDev) {
    paths_checked.push(
      path.join(cwd || '', 'resources', 'fonts'),
      path.join(__dirname, '../../../resources/fonts')
    );
  } else {
    if (resourcesPath) {
      paths_checked.push(
        path.join(resourcesPath, 'fonts')
      );
    }
    if (cwd) {
      paths_checked.push(
        path.join(cwd, 'resources', 'fonts'),
        path.join(cwd, 'fonts')
      );
    }
  }

  for (const checkPath of paths_checked) {
    if (fs.existsSync(checkPath)) {
      return {
        found: true,
        path: checkPath,
        paths_checked
      };
    }
  }

  return {
    found: false,
    paths_checked
  };
}

function checkStorage(storagePath: string) {
  const exists = fs.existsSync(storagePath);
  let writable = false;

  if (exists) {
    try {
      // Test write permission
      const testFile = path.join(storagePath, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      writable = true;
    } catch {
      writable = false;
    }
  } else {
    try {
      // Try to create directory
      fs.mkdirSync(storagePath, { recursive: true });
      writable = true;
    } catch {
      writable = false;
    }
  }

  return {
    path: storagePath,
    exists,
    writable
  };
}

/**
 * Log detailed diagnostics to console
 */
export function logProductionDiagnostics(): void {
  const report = runProductionDiagnostics();

  console.log('\n🔍 ===== PRODUCTION DIAGNOSTICS REPORT =====');
  console.log(`Environment: ${report.environment}`);
  console.log(`App Packaged: ${report.appPackaged}`);

  console.log('\n📁 PATHS:');
  console.log(`  Current Working Directory: ${report.paths.cwd}`);
  console.log(`  Resources Path: ${report.paths.resourcesPath || 'undefined'}`);
  console.log(`  User Data: ${report.paths.userData}`);
  console.log(`  App Path: ${report.paths.appPath}`);

  console.log('\n🔧 RESOURCES:');
  console.log(`  SumatraPDF: ${report.resources.sumatraPDF.found ? '✅' : '❌'} ${report.resources.sumatraPDF.path || 'NOT FOUND'}`);
  if (!report.resources.sumatraPDF.found) {
    console.log(`    Checked paths:`);
    report.resources.sumatraPDF.paths_checked.forEach(p => console.log(`      - ${p}`));
  }

  console.log(`  Logo: ${report.resources.logo.found ? '✅' : '❌'} ${report.resources.logo.path || 'NOT FOUND'}`);
  console.log(`  Fonts: ${report.resources.fonts.found ? '✅' : '❌'} ${report.resources.fonts.path || 'NOT FOUND'}`);

  console.log('\n💾 STORAGE:');
  console.log(`  PDF Storage: ${report.storage.pdfStorage.exists ? '✅' : '❌'} ${report.storage.pdfStorage.path} (Writable: ${report.storage.pdfStorage.writable})`);
  console.log(`  Temp Storage: ${report.storage.tempStorage.exists ? '✅' : '❌'} ${report.storage.tempStorage.path} (Writable: ${report.storage.tempStorage.writable})`);

  console.log('============================================\n');
}

export default {
  runProductionDiagnostics,
  logProductionDiagnostics
};
