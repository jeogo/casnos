// ⚠️ LEGACY: Window routes - Consider migrating to employee routes
// This file is kept for backward compatibility with existing integrations
// New development should use employeeRoutes.ts instead

import { Router } from 'express'
import {
  getAllWindows,
  getWindowById,
  createWindow,
  updateWindow,
  deleteWindow,
  assignServicesToWindow,
  getWindowServices
} from '../controllers/windowController'

const router = Router()

// GET /api/windows - Get all windows
router.get('/', getAllWindows)

// GET /api/windows/:id - Get window by ID
router.get('/:id', getWindowById)

// POST /api/windows - Create a new window
router.post('/', createWindow)

// PUT /api/windows/:id - Update window
router.put('/:id', updateWindow)

// DELETE /api/windows/:id - Delete window
router.delete('/:id', deleteWindow)

// GET /api/windows/:id/services - Get services assigned to window
router.get('/:id/services', getWindowServices)

// PUT /api/windows/:id/services - Assign services to window
router.put('/:id/services', assignServicesToWindow)

export default router
