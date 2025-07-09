"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyResetStatistics = exports.updateDailyResetConfig = exports.forceDailyReset = exports.getDailyResetStatus = void 0;
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const dailyReset_1 = require("../utils/dailyReset");
exports.getDailyResetStatus = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    try {
        const lastResetInfo = await dailyReset_1.dailyResetManager.getLastResetInfo();
        const resetStatus = dailyReset_1.dailyResetManager.getResetStatus();
        const today = new Date().toISOString().split('T')[0];
        const needsReset = !lastResetInfo || lastResetInfo.last_reset_date !== today;
        res.json({
            success: true,
            data: {
                lastReset: lastResetInfo,
                config: resetStatus.config,
                enabled: resetStatus.enabled,
                needsReset,
                currentDate: today,
                message: needsReset
                    ? 'نظام الإعادة اليومية جاهز للتنفيذ'
                    : 'تمت الإعادة اليومية بالفعل اليوم'
            }
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to get daily reset status', 500);
    }
});
exports.forceDailyReset = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    try {
        const startTime = Date.now();
        await dailyReset_1.dailyResetManager.forceImmediateReset();
        const duration = Date.now() - startTime;
        const { getSocketIO } = require('../socket/socket.instance');
        const io = getSocketIO();
        if (io) {
            io.emit('system:reset', {
                message: 'System has been reset by administrator / تم إعادة تعيين النظام من قبل المشرف',
                resetTime: new Date().toISOString(),
                duration: `${duration}ms`,
                forced: true,
                action: 'refresh-required',
                components: {
                    tickets: true,
                    pdfs: true,
                    cache: true
                },
                timestamp: new Date().toISOString()
            });
            console.log('[ADMIN-RESET] 📡 Broadcasted system reset event to all clients');
        }
        res.json({
            success: true,
            message: 'تمت إعادة التعيين اليومية بنجاح',
            data: {
                resetTime: new Date().toISOString(),
                duration: `${duration}ms`,
                forced: true
            }
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to force daily reset', 500);
    }
});
exports.updateDailyResetConfig = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { enabled, resetPDFs, resetTickets, resetCache, keepDays, resetTime } = req.body;
    try {
        const newConfig = {};
        if (typeof enabled === 'boolean')
            newConfig.enabled = enabled;
        if (typeof resetPDFs === 'boolean')
            newConfig.resetPDFs = resetPDFs;
        if (typeof resetTickets === 'boolean')
            newConfig.resetTickets = resetTickets;
        if (typeof resetCache === 'boolean')
            newConfig.resetCache = resetCache;
        if (typeof keepDays === 'number' && keepDays > 0)
            newConfig.keepDays = keepDays;
        if (typeof resetTime === 'string' && /^\d{2}:\d{2}$/.test(resetTime)) {
            newConfig.resetTime = resetTime;
        }
        dailyReset_1.dailyResetManager.updateConfig(newConfig);
        const updatedStatus = dailyReset_1.dailyResetManager.getResetStatus();
        res.json({
            success: true,
            message: 'تم تحديث إعدادات الإعادة اليومية بنجاح',
            data: updatedStatus
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to update daily reset config', 500);
    }
});
exports.getDailyResetStatistics = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    try {
        const lastResetInfo = await dailyReset_1.dailyResetManager.getLastResetInfo();
        const resetStatus = dailyReset_1.dailyResetManager.getResetStatus();
        const today = new Date().toISOString().split('T')[0];
        const needsReset = !lastResetInfo || lastResetInfo.last_reset_date !== today;
        const now = new Date();
        const resetTimeParts = resetStatus.config.resetTime.split(':');
        const [resetHoursStr = '0', resetMinutesStr = '0'] = resetTimeParts;
        const resetHours = parseInt(resetHoursStr, 10) || 0;
        const resetMinutes = parseInt(resetMinutesStr, 10) || 0;
        const nextReset = new Date();
        nextReset.setHours(resetHours, resetMinutes, 0, 0);
        if (nextReset <= now) {
            nextReset.setDate(nextReset.getDate() + 1);
        }
        const timeUntilNextReset = nextReset.getTime() - now.getTime();
        const hoursUntilReset = Math.floor(timeUntilNextReset / (1000 * 60 * 60));
        const minutesUntilReset = Math.floor((timeUntilNextReset % (1000 * 60 * 60)) / (1000 * 60));
        res.json({
            success: true,
            data: {
                lastReset: lastResetInfo,
                config: resetStatus.config,
                enabled: resetStatus.enabled,
                needsReset,
                currentDate: today,
                nextResetTime: nextReset.toISOString(),
                timeUntilNextReset: {
                    hours: hoursUntilReset,
                    minutes: minutesUntilReset,
                    total_milliseconds: timeUntilNextReset
                },
                statistics: {
                    resetScheduledFor: resetStatus.config.resetTime,
                    dataRetentionDays: resetStatus.config.keepDays,
                    components: {
                        tickets: resetStatus.config.resetTickets,
                        pdfs: resetStatus.config.resetPDFs,
                        cache: resetStatus.config.resetCache
                    }
                }
            }
        });
    }
    catch (error) {
        throw (0, errorMiddleware_1.createError)('Failed to get daily reset statistics', 500);
    }
});
