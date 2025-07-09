"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitError = exports.validateRequest = exports.createError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
            message: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            body: req.body
        });
    }
    let message = 'An error occurred while processing your request';
    let statusCode = 500;
    if (err.name === 'ValidationError') {
        message = 'Invalid input data provided';
        statusCode = 400;
    }
    if (err.name === 'CastError') {
        message = 'Invalid identifier format';
        statusCode = 400;
    }
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid authentication token';
        statusCode = 401;
    }
    if (err.name === 'TokenExpiredError') {
        message = 'Authentication token has expired';
        statusCode = 401;
    }
    if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        message = 'Invalid JSON format in request body';
        statusCode = 400;
    }
    if (err.message && err.message.includes('SQLITE_')) {
        if (err.message.includes('CONSTRAINT')) {
            message = 'Data constraint violation';
            statusCode = 409;
        }
        else if (err.message.includes('BUSY')) {
            message = 'Database is temporarily busy, please try again';
            statusCode = 503;
        }
        else {
            message = 'Database operation failed';
            statusCode = 500;
        }
    }
    if (err.isOperational && err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        if (statusCode >= 500) {
            message = 'Internal server error';
        }
        message = message.replace(/\/[^\s]+/g, '[path]')
            .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
            .replace(/password|token|secret|key/gi, '[sensitive]');
    }
    const errorResponse = {
        success: false,
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString()
        }
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.details = {
            originalMessage: err.message,
            stack: err.stack?.split('\n').slice(0, 5).join('\n'),
            type: err.name
        };
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'The requested resource was not found',
            statusCode: 404,
            timestamp: new Date().toISOString()
        }
    });
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        if (!error.isOperational) {
            error.isOperational = false;
        }
        next(error);
    });
};
exports.asyncHandler = asyncHandler;
const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
const validateRequest = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!req.body || Object.keys(req.body).length === 0) {
            return next((0, exports.createError)('Request body is required', 400));
        }
    }
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('sqlmap') || userAgent.includes('nikto')) {
        return next((0, exports.createError)('Request blocked', 403));
    }
    next();
};
exports.validateRequest = validateRequest;
const createRateLimitError = () => {
    return (0, exports.createError)('Too many requests, please try again later', 429);
};
exports.createRateLimitError = createRateLimitError;
