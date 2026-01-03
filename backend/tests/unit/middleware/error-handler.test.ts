/**
 * Unit tests for error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, AppError } from '../../../src/middleware/error-handler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle errors with status code', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
        code: 'TEST_ERROR',
      });
    });

    it('should handle errors without status code', () => {
      const error = new Error('Internal error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        code: undefined,
      });
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Dev error',
        code: undefined,
        stack: expect.any(String),
      });

      process.env.NODE_ENV = 'test';
    });

    it('should log errors', () => {
      const error = new AppError('Logged error', 404);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).toHaveBeenCalledWith(
        'Error: Logged error',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          status: 404,
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for unknown routes', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route GET /test not found',
          status: 404,
          code: 'NOT_FOUND',
        })
      );
    });
  });

  describe('AppError class', () => {
    it('should create custom error with all properties', () => {
      const error = new AppError('Custom error', 403, 'FORBIDDEN');

      expect(error.message).toBe('Custom error');
      expect(error.status).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('AppError');
    });

    it('should use default status 500', () => {
      const error = new AppError('Default status error');

      expect(error.status).toBe(500);
    });
  });
});