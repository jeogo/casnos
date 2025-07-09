"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCASNOSPaths = getCASNOSPaths;
exports.getDatedTicketsPath = getDatedTicketsPath;
exports.getTicketFilePath = getTicketFilePath;
exports.getTempFilePath = getTempFilePath;
exports.initializeCASNOSAppData = initializeCASNOSAppData;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let app = null;
try {
    const electronModule = require('electron');
    app = electronModule.app;
}
catch (error) {
}
function getAppDataPath() {
    try {
        if (app && app.getPath) {
            return app.getPath('userData');
        }
    }
    catch (error) {
    }
    const os = require('os');
    const platform = process.platform;
    const appName = 'CASNOS';
    switch (platform) {
        case 'win32':
            return path.join(os.homedir(), 'AppData', 'Roaming', appName);
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', appName);
        case 'linux':
            return path.join(os.homedir(), '.config', appName);
        default:
            return path.join(os.homedir(), `.${appName}`);
    }
}
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function getCASNOSPaths() {
    const appDataPath = getAppDataPath();
    const dataPath = path.join(appDataPath, 'data');
    const ticketsPath = path.join(appDataPath, 'tickets');
    const logsPath = path.join(appDataPath, 'logs');
    const tempPath = path.join(ticketsPath, 'temp');
    const persistentPath = path.join(dataPath, 'persistent');
    const directories = [appDataPath, dataPath, ticketsPath, logsPath, tempPath, persistentPath];
    directories.forEach(ensureDirectory);
    return {
        appDataPath,
        dataPath,
        ticketsPath,
        logsPath,
        tempPath,
        persistentPath,
        databasePath: path.join(dataPath, 'queue.db'),
        persistentStorageFile: path.join(persistentPath, 'system-state.json'),
        logFile: path.join(logsPath, 'app.log')
    };
}
function getDatedTicketsPath(date) {
    const { ticketsPath } = getCASNOSPaths();
    const targetDate = date || new Date();
    const isoString = targetDate.toISOString();
    const dateFolder = isoString.split('T')[0] || isoString.substring(0, 10);
    const dailyDir = path.join(ticketsPath, dateFolder);
    ensureDirectory(dailyDir);
    return dailyDir;
}
function getTicketFilePath(ticketNumber, serviceName, date) {
    const dailyDir = getDatedTicketsPath(date);
    const cleanServiceName = serviceName && serviceName.trim()
        ? serviceName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-').replace(/-+/g, '-')
        : 'service';
    const fileName = `${cleanServiceName}-${ticketNumber}.pdf`;
    return path.join(dailyDir, fileName);
}
function getTempFilePath(fileName) {
    const { tempPath } = getCASNOSPaths();
    return path.join(tempPath, fileName);
}
function initializeCASNOSAppData() {
    const paths = getCASNOSPaths();
    const configFiles = [
        {
            path: paths.persistentStorageFile,
            content: JSON.stringify({
                version: '1.0.0',
                initialized: new Date().toISOString(),
                screens: {}
            }, null, 2)
        }
    ];
    configFiles.forEach(({ path: filePath, content }) => {
        if (!fs.existsSync(filePath)) {
            try {
                fs.writeFileSync(filePath, content);
                console.log(`[Paths] ✅ Created initial config: ${filePath}`);
            }
            catch (error) {
                console.error(`[Paths] ❌ Failed to create config: ${filePath}`, error);
            }
        }
    });
    console.log(`[Paths] ✅ CASNOS AppData initialized at: ${paths.appDataPath}`);
}
