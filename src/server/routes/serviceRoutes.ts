import { Router } from 'express'
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/serviceController'

const router = Router()

// GET /api/services - Get all services
router.get('/', getAllServices)

// GET /api/services/:id - Get service by ID
router.get('/:id', getServiceById)

// POST /api/services - Create a new service
router.post('/', createService)

// PUT /api/services/:id - Update service
router.put('/:id', updateService)

// DELETE /api/services/:id - Delete service
router.delete('/:id', deleteService)

export default router
