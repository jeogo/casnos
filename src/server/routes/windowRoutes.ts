import express from 'express'
import {
  getAllWindows,
  getWindowById,
  createWindow,
  updateWindow,
  deleteWindow,
  getActiveWindows,
  createWindowWithAutoNumber,
  getWindowsByService,
  getActiveWindowsByService,
  assignServiceToWindow,
  removeServiceFromWindow,
  registerDeviceWindow,
  getWindowByDeviceId,
  activateDeviceWindow,
  deactivateDeviceWindow
} from '../controllers/windowController'

const router = express.Router()

// Get all windows
router.get('/', getAllWindows)

// Get active windows only
router.get('/active', getActiveWindows)

// Get windows by service ID
router.get('/service/:serviceId', getWindowsByService)

// Get active windows by service ID
router.get('/service/:serviceId/active', getActiveWindowsByService)

// Create window with auto-assigned number
router.post('/auto', createWindowWithAutoNumber)

// Register or get window for device (idempotent)
router.post('/register-device', registerDeviceWindow)

// Get window by device ID
router.get('/device/:deviceId', getWindowByDeviceId)

// Activate window for device
router.put('/device/:deviceId/activate', activateDeviceWindow)

// Deactivate window for device
router.put('/device/:deviceId/deactivate', deactivateDeviceWindow)

// Get window by ID
router.get('/:id', getWindowById)

// Create new window
router.post('/', createWindow)

// Update window
router.put('/:id', updateWindow)

// Assign service to window
router.put('/:id/assign-service', assignServiceToWindow)

// Remove service from window
router.put('/:id/remove-service', removeServiceFromWindow)

// Delete window
router.delete('/:id', deleteWindow)

export default router
