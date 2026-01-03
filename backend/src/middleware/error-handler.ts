/**
 * Production-ready error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  status?: number;
  code?: string;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for monitoring
  console.error(`Error: ${err.message}`, {
    method: req.method,
    url: req.url,
    status: err.status || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const status = err.status || 500;
  const message = isDevelopment || status < 500
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: message,
    code: err.code,
    ...(isDevelopment && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new AppError(`Route ${req.method} ${req.url} not found`, 404, 'NOT_FOUND'));
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};