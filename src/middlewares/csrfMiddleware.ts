import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('CSRFMiddleware');

/**
 * CSRF protection middleware
 * Validates the Origin/Referer header against the Host header
 * This is a simple implementation that works for APIs
 * For more complex applications, consider using a CSRF token library
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for non-mutating methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get the origin or referer header
  const origin = req.headers.origin || req.headers.referer;
  
  // Get the host header
  const host = req.headers.host;

  // If no origin/referer, reject the request
  if (!origin) {
    logger.warn('CSRF check failed: No Origin or Referer header', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    return next(new AppError('CSRF check failed: Missing Origin or Referer header', 403));
  }

  try {
    // Parse the origin URL
    const originUrl = new URL(origin);
    
    // Check if the origin host matches the request host
    // This prevents cross-site requests
    if (originUrl.host !== host) {
      logger.warn('CSRF check failed: Origin host does not match request host', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        origin: originUrl.host,
        host
      });
      return next(new AppError('CSRF check failed: Invalid Origin', 403));
    }
    
    next();
  } catch (error) {
    logger.error('CSRF check error:', { error });
    next(new AppError('CSRF check failed: Invalid Origin format', 403));
  }
};

/**
 * Set CSRF protection headers
 * These headers help prevent CSRF attacks by instructing the browser
 * to include the Origin header in cross-origin requests
 */
export const setCsrfHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers to require Origin header
  res.setHeader('Vary', 'Origin');
  
  // Set SameSite cookie attribute to prevent CSRF
  res.setHeader('Set-Cookie', 'SameSite=Strict; Secure');
  
  next();
};