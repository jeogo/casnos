import { Router } from 'express'
import {
  getDailyResetStatus,
  forceDailyReset,
  updateDailyResetConfig,
  getDailyResetStatistics
} from '../controllers/dailyResetController'

const router = Router()

// GET /api/daily-reset/status - الحصول على حالة الإعادة اليومية
router.get('/status', getDailyResetStatus)

// GET /api/daily-reset/statistics - الحصول على إحصائيات الإعادة اليومية
router.get('/statistics', getDailyResetStatistics)

// POST /api/daily-reset/force - فرض إعادة تعيين فورية
router.post('/force', forceDailyReset)

// PUT /api/daily-reset/config - تحديث إعدادات الإعادة اليومية
router.put('/config', updateDailyResetConfig)

export default router
