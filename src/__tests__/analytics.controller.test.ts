import { Request, Response, NextFunction } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { analyticsService } from '../services/license.service';
import { UsageEventType } from '../interfaces/analytics.interface';
import { AppError } from '../middlewares/errorHandler';

// Mock the analytics service
jest.mock('../services/license.service', () => ({
	analyticsService: {
		trackEvent: jest.fn(),
		trackFeatureUsage: jest.fn(),
		getUsageReport: jest.fn(),
		getFeatureUsageStats: jest.fn(),
		getDailyUsageStats: jest.fn(),
		getMostUsedFeatures: jest.fn(),
		getLicenseUsageTrends: jest.fn()
	}
}));

describe('AnalyticsController', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: jest.MockedFunction<NextFunction>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create mock request, response, and next function
		mockRequest = {
			params: {},
			query: {},
			body: {},
			ip: '127.0.0.1',
			headers: {
				'user-agent': 'test-agent',
				'x-device-id': 'test-device'
			}
		};

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn()
		};

		mockNext = jest.fn();
	});

	describe('trackEvent', () => {
		it('should track a custom event', async () => {
			// Arrange
			const event = {
				licenseId: '123456789012345678901234',
				schoolId: 'school123',
				eventType: UsageEventType.CUSTOM,
				eventData: { test: 'data' }
			};

			mockRequest.body = event;

			const expectedEvent = {
				...event,
				timestamp: new Date(),
				clientInfo: {
					ip: mockRequest.ip,
					userAgent: mockRequest.headers['user-agent'],
					deviceId: mockRequest.headers['x-device-id']
				}
			};

			(analyticsService.trackEvent as jest.Mock).mockResolvedValue(expectedEvent);

			// Act
			await analyticsController.trackEvent(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
				licenseId: event.licenseId,
				schoolId: event.schoolId,
				eventType: event.eventType,
				eventData: event.eventData,
				clientInfo: expect.objectContaining({
					ip: mockRequest.ip,
					userAgent: mockRequest.headers['user-agent'],
					deviceId: mockRequest.headers['x-device-id']
				})
			}));

			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: expectedEvent
			});
		});

		it('should return 400 if required parameters are missing', async () => {
			// Arrange
			mockRequest.body = {
				// Missing required parameters
				eventType: UsageEventType.CUSTOM
			};

			// Act
			await analyticsController.trackEvent(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.trackEvent).not.toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
			expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
		});
	});

	describe('trackFeatureUsage', () => {
		it('should track feature usage', async () => {
			// Arrange
			const requestBody = {
				licenseId: '123456789012345678901234',
				schoolId: 'school123',
				featureName: 'test-feature',
				eventData: { test: 'data' }
			};

			mockRequest.body = requestBody;

			const expectedEvent = {
				licenseId: requestBody.licenseId,
				schoolId: requestBody.schoolId,
				eventType: UsageEventType.FEATURE_ACCESS,
				featureName: requestBody.featureName,
				eventData: requestBody.eventData,
				timestamp: new Date(),
				clientInfo: {
					ip: mockRequest.ip,
					userAgent: mockRequest.headers['user-agent'],
					deviceId: mockRequest.headers['x-device-id']
				}
			};

			(analyticsService.trackFeatureUsage as jest.Mock).mockResolvedValue(expectedEvent);

			// Act
			await analyticsController.trackFeatureUsage(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith(
				requestBody.licenseId,
				requestBody.schoolId,
				requestBody.featureName,
				requestBody.eventData,
				expect.objectContaining({
					ip: mockRequest.ip,
					userAgent: mockRequest.headers['user-agent'],
					deviceId: mockRequest.headers['x-device-id']
				})
			);

			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: expectedEvent
			});
		});
	});

	describe('getUsageReport', () => {
		it('should get usage report for a license', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockRequest.params = { licenseId };

			const mockReport = {
				licenseId,
				schoolId: 'school123',
				schoolName: 'Test School',
				period: {
					start: new Date(),
					end: new Date()
				},
				summary: {
					totalEvents: 100,
					uniqueFeatures: 5,
					eventsByType: {
						[UsageEventType.FEATURE_ACCESS]: 80,
						[UsageEventType.API_CALL]: 20
					}
				},
				featureUsage: [],
				dailyUsage: []
			};

			(analyticsService.getUsageReport as jest.Mock).mockResolvedValue(mockReport);

			// Act
			await analyticsController.getUsageReport(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.getUsageReport).toHaveBeenCalledWith(licenseId, expect.any(Object));
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockReport
			});
		});
	});

	describe('getFeatureUsageStats', () => {
		it('should get feature usage statistics', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockRequest.params = { licenseId };

			const mockStats = [
				{
					featureName: 'feature1',
					accessCount: 50,
					lastAccessed: new Date()
				},
				{
					featureName: 'feature2',
					accessCount: 30,
					lastAccessed: new Date()
				}
			];

			(analyticsService.getFeatureUsageStats as jest.Mock).mockResolvedValue(mockStats);

			// Act
			await analyticsController.getFeatureUsageStats(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.getFeatureUsageStats).toHaveBeenCalledWith(licenseId, expect.any(Object));
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockStats
			});
		});
	});

	describe('getDailyUsageStats', () => {
		it('should get daily usage statistics', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockRequest.params = { licenseId };

			const mockStats = [
				{
					date: '2025-07-20',
					count: 30,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 25,
						[UsageEventType.API_CALL]: 5
					}
				},
				{
					date: '2025-07-21',
					count: 40,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 30,
						[UsageEventType.API_CALL]: 10
					}
				}
			];

			(analyticsService.getDailyUsageStats as jest.Mock).mockResolvedValue(mockStats);

			// Act
			await analyticsController.getDailyUsageStats(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.getDailyUsageStats).toHaveBeenCalledWith(licenseId, expect.any(Object));
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockStats
			});
		});
	});

	describe('getMostUsedFeatures', () => {
		it('should get most used features', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockRequest.params = { licenseId };
			mockRequest.query = { limit: '3' };

			const mockFeatures = [
				{
					featureName: 'feature1',
					accessCount: 50
				},
				{
					featureName: 'feature2',
					accessCount: 30
				},
				{
					featureName: 'feature3',
					accessCount: 20
				}
			];

			(analyticsService.getMostUsedFeatures as jest.Mock).mockResolvedValue(mockFeatures);

			// Act
			await analyticsController.getMostUsedFeatures(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.getMostUsedFeatures).toHaveBeenCalledWith(licenseId, 3);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockFeatures
			});
		});
	});

	describe('getLicenseUsageTrends', () => {
		it('should get license usage trends', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockRequest.params = { licenseId };
			mockRequest.query = { days: '7' };

			const mockTrends = [
				{
					date: '2025-07-15',
					count: 20
				},
				{
					date: '2025-07-16',
					count: 25
				},
				{
					date: '2025-07-17',
					count: 30
				}
			];

			(analyticsService.getLicenseUsageTrends as jest.Mock).mockResolvedValue(mockTrends);

			// Act
			await analyticsController.getLicenseUsageTrends(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Assert
			expect(analyticsService.getLicenseUsageTrends).toHaveBeenCalledWith(licenseId, 7);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				data: mockTrends
			});
		});
	});
});