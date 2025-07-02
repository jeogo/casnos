import { Request, Response } from 'express'
import { asyncHandler, createError } from '../middleware/errorMiddleware'
import { dailyResetManager } from '../utils/dailyReset'

// الحصول على معلومات آخر إعادة تعيين يومية
export const getDailyResetStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const lastResetInfo = await dailyResetManager.getLastResetInfo()
    const resetStatus = dailyResetManager.getResetStatus()

    const today = new Date().toISOString().split('T')[0]
    const needsReset = !lastResetInfo || lastResetInfo.last_reset_date !== today

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
    })
  } catch (error) {
    throw createError('Failed to get daily reset status', 500)
  }
})

// فرض إعادة تعيين فورية (للاستخدام الإداري)
export const forceDailyReset = asyncHandler(async (req: Request, res: Response) => {
  try {
    const startTime = Date.now()

    await dailyResetManager.forceImmediateReset()

    const duration = Date.now() - startTime

    res.json({
      success: true,
      message: 'تمت إعادة التعيين اليومية بنجاح',
      data: {
        resetTime: new Date().toISOString(),
        duration: `${duration}ms`,
        forced: true
      }
    })
  } catch (error) {
    throw createError('Failed to force daily reset', 500)
  }
})

// تحديث إعدادات الإعادة اليومية
export const updateDailyResetConfig = asyncHandler(async (req: Request, res: Response) => {
  const { enabled, resetPDFs, resetTickets, resetCache, keepDays, resetTime } = req.body

  try {
    const newConfig: any = {}

    if (typeof enabled === 'boolean') newConfig.enabled = enabled
    if (typeof resetPDFs === 'boolean') newConfig.resetPDFs = resetPDFs
    if (typeof resetTickets === 'boolean') newConfig.resetTickets = resetTickets
    if (typeof resetCache === 'boolean') newConfig.resetCache = resetCache
    if (typeof keepDays === 'number' && keepDays > 0) newConfig.keepDays = keepDays
    if (typeof resetTime === 'string' && /^\d{2}:\d{2}$/.test(resetTime)) {
      newConfig.resetTime = resetTime
    }

    dailyResetManager.updateConfig(newConfig)
    const updatedStatus = dailyResetManager.getResetStatus()

    res.json({
      success: true,
      message: 'تم تحديث إعدادات الإعادة اليومية بنجاح',
      data: updatedStatus
    })
  } catch (error) {
    throw createError('Failed to update daily reset config', 500)
  }
})

// الحصول على إحصائيات الإعادة اليومية
export const getDailyResetStatistics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const lastResetInfo = await dailyResetManager.getLastResetInfo()
    const resetStatus = dailyResetManager.getResetStatus()

    const today = new Date().toISOString().split('T')[0]
    const needsReset = !lastResetInfo || lastResetInfo.last_reset_date !== today

    // حساب الوقت المتبقي للإعادة التالية
    const now = new Date()

    // Parse reset time safely with destructuring and defaults
    const resetTimeParts = resetStatus.config.resetTime.split(':')
    const [resetHoursStr = '0', resetMinutesStr = '0'] = resetTimeParts
    const resetHours = parseInt(resetHoursStr, 10) || 0
    const resetMinutes = parseInt(resetMinutesStr, 10) || 0

    const nextReset = new Date()
    nextReset.setHours(resetHours, resetMinutes, 0, 0)

    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }

    const timeUntilNextReset = nextReset.getTime() - now.getTime()
    const hoursUntilReset = Math.floor(timeUntilNextReset / (1000 * 60 * 60))
    const minutesUntilReset = Math.floor((timeUntilNextReset % (1000 * 60 * 60)) / (1000 * 60))

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
    })
  } catch (error) {
    throw createError('Failed to get daily reset statistics', 500)
  }
})
