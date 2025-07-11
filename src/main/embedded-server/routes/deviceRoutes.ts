import { Router } from 'express'
import {
  getAllDevices,
  getDeviceById,
  getDeviceByDeviceId,
  getOnlineDevices,
  getDevicesByType,
  createDevice,
  updateDevice,
  updateDeviceStatus,
  deleteDevice,
  getAllDevicePrinters,
  getDevicePrintersByDevice,
  createDevicePrinter,
  updateDevicePrinter,
  deleteDevicePrinter
} from '../controllers/deviceController'

const router = Router()

// Device Management Routes
router.get('/', getAllDevices)
router.get('/online', getOnlineDevices)

// Device Printer Management Routes (قبل dynamic routes)
router.get('/printers/all', getAllDevicePrinters)

router.get('/type/:type', getDevicesByType)
router.get('/:id', getDeviceById)
router.get('/device-id/:deviceId', getDeviceByDeviceId)
router.post('/', createDevice)
router.post('/register', createDevice) // Add register endpoint that uses createDevice
router.put('/:id', updateDevice)
router.patch('/:deviceId/status', updateDeviceStatus)
router.delete('/:id', deleteDevice)

// Device Printer Management Routes (باقي الـ routes)
router.get('/:deviceId/printers', getDevicePrintersByDevice)
router.post('/:deviceId/printers', createDevicePrinter)
router.put('/printers/:id', updateDevicePrinter)
router.delete('/printers/:id', deleteDevicePrinter)

export default router
