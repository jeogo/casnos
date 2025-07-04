import express from 'express'
import {
  getAllWindows,
  getWindowById,
  createWindow,
  updateWindow,
  deleteWindow,
  getActiveWindows,
  createWindowWithAutoNumber
} from '../controllers/windowController'

const router = express.Router()

// Get all windows
router.get('/', getAllWindows)

// Get active windows only
router.get('/active', getActiveWindows)

// Create window with auto-assigned number
router.post('/auto', createWindowWithAutoNumber)

// Get window by ID
router.get('/:id', getWindowById)

// Create new window
router.post('/', createWindow)

// Update window
router.put('/:id', updateWindow)

// Delete window
router.delete('/:id', deleteWindow)

export default router
