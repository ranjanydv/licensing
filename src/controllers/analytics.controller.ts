import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/license.service';
import { AppError } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';
import { UsageEventType } from '../interfaces/analytics.interface';
import { subDays, parseISO } from 'date-fns';

const logger = new Logger('AnalyticsController');

/**
 * Controller for analytics endpoints
 */
export class AnalyticsController {
	/**
	 * Track a custom usage event
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId, schoolId, eventType, featureName, eventData } = req.body;

			if (!licenseId || !schoolId || !eventType) {
				throw new AppError('Missing required parameters: licenseId, schoolId, eventType', 400);
			}

			// Get client info from request
			const clientInfo = {
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				deviceId: req.headers['x-device-id'] as string
			};

			const event = await analyticsService.trackEvent({
				licenseId,
				schoolId,
				eventType: eventType as UsageEventType,
				featureName,
				eventData,
				clientInfo
			});

			res.status(201).json({
				success: true,
				data: event
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Track feature usage
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async trackFeatureUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId, schoolId, featureName, eventData } = req.body;

			if (!licenseId || !schoolId || !featureName) {
				throw new AppError('Missing required parameters: licenseId, schoolId, featureName', 400);
			}

			// Get client info from request
			const clientInfo = {
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				deviceId: req.headers['x-device-id'] as string
			};

			const event = await analyticsService.trackFeatureUsage(
				licenseId,
				schoolId,
				featureName,
				eventData,
				clientInfo
			);

			res.status(201).json({
				success: true,
				data: event
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get usage report for a license
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async getUsageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId } = req.params;
			const { startDate, endDate, eventTypes, features } = req.query;

			if (!licenseId) {
				throw new AppError('Missing required parameter: licenseId', 400);
			}

			// Parse query parameters
			const options: any = {};

			if (startDate) {
				options.startDate = typeof startDate === 'string' ? parseISO(startDate) : subDays(new Date(), 30);
			}

			if (endDate) {
				options.endDate = typeof endDate === 'string' ? parseISO(endDate) : new Date();
			}

			if (eventTypes) {
				options.eventTypes = Array.isArray(eventTypes)
					? eventTypes as UsageEventType[]
					: [eventTypes as UsageEventType];
			}

			if (features) {
				options.features = Array.isArray(features)
					? features as string[]
					: [features as string];
			}

			const report = await analyticsService.getUsageReport(licenseId, options);

			res.status(200).json({
				success: true,
				data: report
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get feature usage statistics
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async getFeatureUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId } = req.params;
			const { startDate, endDate } = req.query;

			if (!licenseId) {
				throw new AppError('Missing required parameter: licenseId', 400);
			}

			// Parse query parameters
			const options: any = {};

			if (startDate) {
				options.startDate = typeof startDate === 'string' ? parseISO(startDate) : subDays(new Date(), 30);
			}

			if (endDate) {
				options.endDate = typeof endDate === 'string' ? parseISO(endDate) : new Date();
			}

			const stats = await analyticsService.getFeatureUsageStats(licenseId, options);

			res.status(200).json({
				success: true,
				data: stats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get daily usage statistics
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async getDailyUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId } = req.params;
			const { startDate, endDate, eventTypes } = req.query;

			if (!licenseId) {
				throw new AppError('Missing required parameter: licenseId', 400);
			}

			// Parse query parameters
			const options: any = {};

			if (startDate) {
				options.startDate = typeof startDate === 'string' ? parseISO(startDate) : subDays(new Date(), 30);
			}

			if (endDate) {
				options.endDate = typeof endDate === 'string' ? parseISO(endDate) : new Date();
			}

			if (eventTypes) {
				options.eventTypes = Array.isArray(eventTypes)
					? eventTypes as UsageEventType[]
					: [eventTypes as UsageEventType];
			}

			const stats = await analyticsService.getDailyUsageStats(licenseId, options);

			res.status(200).json({
				success: true,
				data: stats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get most used features
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async getMostUsedFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId } = req.params;
			const { limit } = req.query;

			if (!licenseId) {
				throw new AppError('Missing required parameter: licenseId', 400);
			}

			const limitValue = limit ? parseInt(limit as string, 10) : 5;

			const features = await analyticsService.getMostUsedFeatures(licenseId, limitValue);

			res.status(200).json({
				success: true,
				data: features
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get license usage trends
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	async getLicenseUsageTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { licenseId } = req.params;
			const { days } = req.query;

			if (!licenseId) {
				throw new AppError('Missing required parameter: licenseId', 400);
			}

			const daysValue = days ? parseInt(days as string, 10) : 30;

			const trends = await analyticsService.getLicenseUsageTrends(licenseId, daysValue);

			res.status(200).json({
				success: true,
				data: trends
			});
		} catch (error) {
			next(error);
		}
	}
}

// Export singleton instance
export const analyticsController = new AnalyticsController();

export default analyticsController;