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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAllSchemas = exports.closeDatabase = exports.getDatabase = void 0;
exports.initializeDatabase = initializeDatabase;
exports.shutdownDatabase = shutdownDatabase;
const connection_1 = require("./connection");
Object.defineProperty(exports, "getDatabase", { enumerable: true, get: function () { return connection_1.getDatabase; } });
Object.defineProperty(exports, "closeDatabase", { enumerable: true, get: function () { return connection_1.closeConnection; } });
const schemas_1 = require("./schemas");
const operations_1 = require("./operations");
__exportStar(require("./operations"), exports);
var schemas_2 = require("./schemas");
Object.defineProperty(exports, "createAllSchemas", { enumerable: true, get: function () { return schemas_2.createAllSchemas; } });
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🚀 Initializing database system...');
            (0, connection_1.initializeConnection)();
            (0, schemas_1.createAllSchemas)();
            ensureDefaultService();
            performDailyResetIfNeeded();
            console.log('✅ Database system initialized successfully');
            const health = operations_1.systemOperations.healthCheck();
            console.log('📊 Database health:', health.status);
            resolve();
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            reject(error);
        }
    });
}
function performDailyResetIfNeeded() {
    try {
        if (operations_1.systemOperations.needsReset()) {
            console.log('🔄 Performing daily reset...');
            const today = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10);
            const timestamp = new Date().toISOString();
            operations_1.systemOperations.performTicketReset();
            operations_1.systemOperations.createResetRecord({
                last_reset_date: today,
                last_reset_timestamp: timestamp,
                tickets_reset: true,
                pdfs_reset: false,
                cache_reset: false
            });
            console.log('✅ Daily reset completed');
        }
        else {
            console.log('ℹ️ Daily reset already performed today');
        }
    }
    catch (error) {
        console.error('❌ Daily reset failed:', error);
    }
}
function ensureDefaultService() {
    try {
        const existingServices = operations_1.serviceOperations.getAll();
        if (existingServices.length === 0) {
            console.log('🏢 No services found, creating default service...');
            const defaultService = operations_1.serviceOperations.create({
                name: 'الشباك المشترك'
            });
            console.log('✅ Default service created:', defaultService.name);
        }
        else {
            console.log(`ℹ️ Found ${existingServices.length} existing service(s)`);
        }
    }
    catch (error) {
        console.error('❌ Failed to ensure default service:', error);
    }
}
function shutdownDatabase() {
    try {
        console.log('🔄 Shutting down database...');
        (0, connection_1.closeConnection)();
        console.log('✅ Database shutdown complete');
    }
    catch (error) {
        console.error('❌ Database shutdown error:', error);
    }
}
