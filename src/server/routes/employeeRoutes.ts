import express from 'express'
import {
  getAllEmployees,
  getActiveEmployees,
  getEmployeeByWindowNumber,
  getNextWindowNumber,
  createEmployeeWindow,
  assignServiceToEmployee,
  removeServiceFromEmployee,
  updateEmployee,
  deleteEmployee,
  initializeEmployeeSession
} from '../controllers/employeeController'

const router = express.Router()

// Get all employees
router.get('/', getAllEmployees)

// Get active employees only
router.get('/active', getActiveEmployees)

// Get next available window number
router.get('/next-window-number', getNextWindowNumber)

// Initialize employee session (for new employee devices)
router.post('/initialize', initializeEmployeeSession)

// Create new employee window
router.post('/window', createEmployeeWindow)

// Get employee by window number
router.get('/window/:windowNumber', getEmployeeByWindowNumber)

// Assign service to employee by window number
router.post('/window/:windowNumber/assign-service', assignServiceToEmployee)

// Remove service from employee by window number
router.delete('/window/:windowNumber/service', removeServiceFromEmployee)

// Update employee by ID
router.put('/:id', updateEmployee)

// Delete employee by ID
router.delete('/:id', deleteEmployee)

export default router
