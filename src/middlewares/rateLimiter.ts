import rateLimit from 'express-rate-limit';
import { Logger } from '../utils/logger';
const logger = new Logger('RateLimiter');

/**
 * Rate limiter for API endpoints
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMinutes Time window in minutes
 * @param message Custom message to return when limit is reached
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (
	maxRequests: number = 100,
	windowMinutes: number = 15,
	message: string = 'Too many requests, please try again later'
) => {
	return rateLimit({
		max: maxRequests,
		windowMs: windowMinutes * 60 * 1000,
		message: {
			status: 'error',
			message
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req, res, next, options) => {
			logger.warn('Rate limit exceeded', {
				ip: req.ip,
				path: req.path,
				method: req.method
			});

			res.status(429).json(options.message);
		}
	});
};

/**
 * Rate limiter for license validation endpoint
 * More strict limits to prevent brute force attacks
 */
export const licenseValidationLimiter = createRateLimiter(
	50,
	15,
	'Too many license validation attempts, please try again later'
);

/**
 * Rate limiter for license generation endpoint
 */
export const licenseGenerationLimiter = createRateLimiter(
	20,
	60,
	'Too many license generation attempts, please try again later'
);

/**
 * Rate limiter for authentication endpoints
 * Strict limits to prevent brute force attacks
 */
export const authLimiter = createRateLimiter(
	10,
	15,
	'Too many authentication attempts, please try again later'
);

/**
 * General API rate limiter
 */
export const apiLimiter = createRateLimiter();