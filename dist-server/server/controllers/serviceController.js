"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteService = exports.updateService = exports.createService = exports.getServiceById = exports.getAllServices = void 0;
const db_1 = require("../db");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
exports.getAllServices = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const services = db_1.serviceOperations.getAll();
    res.json({
        success: true,
        count: services.length,
        data: services
    });
});
exports.getServiceById = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.id);
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    const service = db_1.serviceOperations.getById(serviceId);
    if (!service) {
        throw (0, errorMiddleware_1.createError)('Service not found', 404);
    }
    res.json({
        success: true,
        data: service
    });
});
exports.createService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
        throw (0, errorMiddleware_1.createError)('Service name is required', 400);
    }
    if (name.length > 100) {
        throw (0, errorMiddleware_1.createError)('Service name must be less than 100 characters', 400);
    }
    const existingServices = db_1.serviceOperations.getAll();
    const existingService = existingServices.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (existingService) {
        res.status(200).json({
            success: true,
            data: existingService,
            message: 'Service already exists'
        });
        return;
    }
    try {
        const newService = db_1.serviceOperations.create({
            name: name.trim()
        });
        res.status(201).json({
            success: true,
            data: newService
        });
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const allServices = db_1.serviceOperations.getAll();
            const foundService = allServices.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
            if (foundService) {
                res.status(200).json({
                    success: true,
                    data: foundService,
                    message: 'Service already exists'
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Database constraint error'
            });
            return;
        }
        throw error;
    }
});
exports.updateService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.id);
    const { name } = req.body;
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    if (!name || name.trim().length === 0) {
        throw (0, errorMiddleware_1.createError)('Service name is required', 400);
    }
    if (name.length > 100) {
        throw (0, errorMiddleware_1.createError)('Service name must be less than 100 characters', 400);
    }
    try {
        const updatedService = db_1.serviceOperations.update(serviceId, {
            name: name.trim()
        });
        if (!updatedService) {
            throw (0, errorMiddleware_1.createError)('Service not found', 404);
        }
        res.json({
            success: true,
            data: updatedService
        });
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw (0, errorMiddleware_1.createError)('Service name already exists', 409);
        }
        throw error;
    }
});
exports.deleteService = (0, errorMiddleware_1.asyncHandler)(async (req, res) => {
    const serviceId = parseInt(req.params.id);
    if (isNaN(serviceId)) {
        throw (0, errorMiddleware_1.createError)('Invalid service ID', 400);
    }
    const deleted = db_1.serviceOperations.delete(serviceId);
    if (!deleted) {
        throw (0, errorMiddleware_1.createError)('Service not found', 404);
    }
    res.json({
        success: true,
        message: 'Service deleted successfully'
    });
});
