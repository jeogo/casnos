# CASNOS AppData Migration Plan

## 📋 Overview
This document outlines the comprehensive migration plan to move all CASNOS runtime data from `process.cwd()` to the user's AppData directory, ensuring the application works as standalone executables on clean Windows PCs.

## 🎯 Goals
1. **Portable Deployment**: App works on clean Windows PCs without Node.js/dev tools
2. **Separate Executables**: Each screen (customer, display, window, admin) as individual executables
3. **AppData Storage**: All runtime data in `app.getPath('userData')` directory
4. **Reliable Operation**: Ticket generation, printing, and file operations work correctly

## 📊 Current Issues Analysis

### 1. Data Storage Locations (❌ Current Issues)
- **Database**: `process.cwd()/data/queue.db` → Won't work in packaged apps
- **PDF Storage**: `process.cwd()/resources/tickets/` → Won't work in packaged apps
- **Persistent Storage**: `process.cwd()/data/persistent/` → Won't work in packaged apps
- **Temp Files**: Various temp paths using `process.cwd()`

### 2. Resource Access (❌ Current Issues)
- **SumatraPDF**: Uses `process.resourcesPath` and `process.cwd()` fallbacks
- **Assets**: Mix of relative and absolute paths
- **Config Files**: Project-relative paths

### 3. Build System (✅ Already Works)
- Individual screen builds: `npm run build:display`, `npm run build:customer`, etc.
- Electron-builder configuration supports separate executables
- Screen detection and optimization already implemented

## 🔄 Migration Strategy

### Phase 1: Create AppData Path Manager
Create a centralized utility to manage all AppData paths.

**Files to Create:**
- `src/main/utils/appDataManager.ts` - Central AppData path management
- `src/main/utils/resourcePathManager.ts` - Resource path resolution for packaged apps

### Phase 2: Database Migration
Move database from `process.cwd()` to AppData.

**Files to Modify:**
- `src/server/db/connection.ts` - Update database path
- `src/server/db/index.ts` - Update initialization

### Phase 3: PDF Storage Migration
Move PDF storage from `process.cwd()` to AppData.

**Files to Modify:**
- `src/main/utils/pdfStorage.ts` - Update storage paths
- `src/main/handlers/printHandlers.ts` - Update PDF paths

### Phase 4: Persistent Storage Migration
Move persistent storage from `process.cwd()` to AppData.

**Files to Modify:**
- `src/main/utils/persistentStorage.ts` - Update storage paths

### Phase 5: Resource Path Updates
Update resource access for packaged apps.

**Files to Modify:**
- `src/main/utils/sumatraPDFManager.ts` - Update resource paths
- `src/main/protocols/resourceProtocol.ts` - Update resource serving

### Phase 6: Build System Updates
Ensure build system creates truly portable executables.

**Files to Modify:**
- `electron-builder.yml` - Update build configuration
- `scripts/build-single.js` - Update build scripts

## 📁 New AppData Directory Structure

```
%APPDATA%/CASNOS/
├── data/
│   ├── queue.db                    # Main database
│   ├── queue.db-shm               # SQLite shared memory
│   ├── queue.db-wal               # SQLite write-ahead log
│   └── persistent/
│       └── system-state.json      # Persistent storage
├── tickets/
│   ├── 2024-01-15/                # Daily folders
│   │   ├── service-1-001.pdf
│   │   └── service-2-002.pdf
│   └── temp/                      # Temporary files
└── logs/
    └── app.log                    # Application logs
```

## 🔧 Implementation Details

### 1. AppData Manager Implementation

```typescript
// src/main/utils/appDataManager.ts
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export class AppDataManager {
  private static instance: AppDataManager
  private appDataPath: string
  private dataPath: string
  private ticketsPath: string
  private logsPath: string

  private constructor() {
    this.appDataPath = app.getPath('userData')
    this.dataPath = path.join(this.appDataPath, 'data')
    this.ticketsPath = path.join(this.appDataPath, 'tickets')
    this.logsPath = path.join(this.appDataPath, 'logs')

    this.ensureDirectories()
  }

  static getInstance(): AppDataManager {
    if (!AppDataManager.instance) {
      AppDataManager.instance = new AppDataManager()
    }
    return AppDataManager.instance
  }

  // Path getters
  getAppDataPath(): string { return this.appDataPath }
  getDataPath(): string { return this.dataPath }
  getTicketsPath(): string { return this.ticketsPath }
  getLogsPath(): string { return this.logsPath }

  // Specific file paths
  getDatabasePath(): string { return path.join(this.dataPath, 'queue.db') }
  getPersistentStoragePath(): string { return path.join(this.dataPath, 'persistent') }
  getTempPath(): string { return path.join(this.ticketsPath, 'temp') }

  private ensureDirectories(): void {
    const dirs = [this.dataPath, this.ticketsPath, this.logsPath]
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
  }
}
```

### 2. Database Connection Update

```typescript
// src/server/db/connection.ts (Updated)
import Database from 'better-sqlite3'
import { AppDataManager } from '../main/utils/appDataManager'

const appDataManager = AppDataManager.getInstance()
const DB_PATH = appDataManager.getDatabasePath()

// Rest of the implementation...
```

### 3. PDF Storage Update

```typescript
// src/main/utils/pdfStorage.ts (Updated)
import { AppDataManager } from './appDataManager'

export class PDFStorageManager {
  private appDataManager: AppDataManager
  private baseDir: string
  private tempDir: string

  private constructor() {
    this.appDataManager = AppDataManager.getInstance()
    this.baseDir = this.appDataManager.getTicketsPath()
    this.tempDir = this.appDataManager.getTempPath()
    // Rest of initialization...
  }
}
```

### 4. Resource Path Manager

```typescript
// src/main/utils/resourcePathManager.ts
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export class ResourcePathManager {
  private static instance: ResourcePathManager
  private resourcesPath: string
  private assetsPath: string

  private constructor() {
    // In production, use app.getAppPath() or process.resourcesPath
    // In development, use process.cwd()
    this.resourcesPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'resources')
      : path.join(process.cwd(), 'resources')

    this.assetsPath = path.join(this.resourcesPath, 'assets')
  }

  static getInstance(): ResourcePathManager {
    if (!ResourcePathManager.instance) {
      ResourcePathManager.instance = new ResourcePathManager()
    }
    return ResourcePathManager.instance
  }

  getResourcesPath(): string { return this.resourcesPath }
  getAssetsPath(): string { return this.assetsPath }

  getSumatraPDFPath(): string {
    return path.join(this.assetsPath, 'SumatraPDF.exe')
  }

  getAssetPath(filename: string): string {
    return path.join(this.assetsPath, filename)
  }
}
```

## 🧪 Testing Strategy

### 1. Development Testing
- Test with `npm run dev` to ensure development still works
- Test each screen individually: `npm run dev:customer`, `npm run dev:display`, etc.

### 2. Build Testing
- Build each screen: `npm run build:customer`, `npm run build:display`, etc.
- Test built executables on development machine

### 3. Clean PC Testing
- Test built executables on clean Windows PC without Node.js
- Test ticket generation, printing, and file operations
- Verify AppData directory creation and population

### 4. Migration Testing
- Test migration from existing data structure
- Verify data integrity after migration

## 📋 Implementation Checklist

### Core Infrastructure
- [ ] Create `AppDataManager` class
- [ ] Create `ResourcePathManager` class
- [ ] Update database connection to use AppData
- [ ] Update PDF storage to use AppData
- [ ] Update persistent storage to use AppData

### Resource Management
- [ ] Update SumatraPDF manager for packaged apps
- [ ] Update resource protocol for packaged apps
- [ ] Update asset loading paths

### Build System
- [ ] Update electron-builder configuration
- [ ] Update build scripts for portable executables
- [ ] Test separate executable builds

### Testing & Validation
- [ ] Test development environment
- [ ] Test built executables
- [ ] Test on clean Windows PC
- [ ] Test ticket generation and printing
- [ ] Test file operations and data persistence

### Documentation
- [ ] Update deployment documentation
- [ ] Create user installation guide
- [ ] Document AppData structure
- [ ] Update troubleshooting guide

## 🚀 Deployment Guide

### For End Users
1. Download the appropriate executable for your screen type
2. Run the executable - it will automatically create AppData directories
3. No additional setup required

### For Administrators
1. Build all screen types: `npm run build:all-screens`
2. Distribute executables to appropriate machines
3. Each executable is self-contained and portable

## 🔧 Troubleshooting

### Common Issues
1. **Database locked**: Ensure only one instance runs per screen type
2. **PDF generation fails**: Check AppData permissions
3. **Resource not found**: Verify build includes all required assets

### Debugging
- Check AppData directory: `%APPDATA%/CASNOS/`
- Check logs: `%APPDATA%/CASNOS/logs/app.log`
- Verify executable includes all dependencies

## 📈 Benefits After Migration

1. **True Portability**: App works on any Windows PC without dependencies
2. **User Data Safety**: All data stored in standard AppData location
3. **Easy Deployment**: Single executable per screen type
4. **Proper Isolation**: Each screen runs independently
5. **Standard Behavior**: Follows Windows application conventions

## 🏁 Success Criteria

- [ ] All screens work as standalone executables
- [ ] Ticket generation and printing work correctly
- [ ] Data persists between app restarts
- [ ] App works on clean Windows PC
- [ ] No dependency on Node.js or dev tools
- [ ] All files stored in AppData directory
- [ ] No errors in production environment

---

**Next Steps**: Begin with Phase 1 (AppData Path Manager) and proceed systematically through each phase, testing thoroughly at each step.
