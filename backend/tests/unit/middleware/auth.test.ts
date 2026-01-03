/**
 * Unit tests for authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../../src/middleware/auth';

// Mock jwt
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it('should authenticate valid token and set userId', () => {
    const mockToken = 'valid-jwt-token';
    const mockUserId = 'user-123';

    mockReq.headers = {
      'authorization': `Bearer ${mockToken}`
    };

    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(null, { userId: mockUserId });
    });

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(
      mockToken,
      process.env.JWT_SECRET,
      expect.any(Function)
    );
    expect((mockReq as any).userId).toBe(mockUserId);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should reject request without authorization header', () => {
    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request without Bearer token', () => {
    mockReq.headers = {
      'authorization': 'InvalidFormat token'
    };

    // Mock JWT verify to reject the token
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    });

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject invalid token', () => {
    const mockToken = 'invalid-jwt-token';

    mockReq.headers = {
      'authorization': `Bearer ${mockToken}`
    };

    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    });

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject expired token', () => {
    const mockToken = 'expired-jwt-token';

    mockReq.headers = {
      'authorization': `Bearer ${mockToken}`
    };

    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      callback(error, null);
    });

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle malformed authorization header', () => {
    mockReq.headers = {
      'authorization': 'Bearer'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle missing Bearer prefix', () => {
    mockReq.headers = {
      'authorization': 'some-token-without-bearer'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});