import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { UsageEventType, UsageEvent } from '../interfaces/analytics.interface';
import { LicenseService } from '../services/license.service';
import { License, LicenseStatus } from '../interfaces/license.interface';
import { subDays } from 'date-fns';

// Mock the analytics repository
const mockAnalyticsRepository = {
	trackEvent: jest.fn(),
	findEvents: jest.fn(),
	countEvents: jest.fn(),
	getFeatureUsage: jest.fn(),
	getDailyUsage: jest.fn()
} as unknown as AnalyticsRepository;

// Mock the license service
const mockLicenseService = {
	getLicense: jest.fn()
} as unknown as LicenseService;

describe('AnalyticsService', () => {
	let analyticsService: AnalyticsService;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create service instance with mocked dependencies
		analyticsService = new AnalyticsService(
			mockAnalyticsRepository,
			mockLicenseService
		);
	});

	describe('trackEvent', () => {
		it('should track a usage event', async () => {
			// Arrange
			const event = {
				licenseId: '123456789012345678901234',
				schoolId: 'school123',
				eventType: UsageEventType.FEATURE_ACCESS,
				featureName: 'test-feature',
				eventData: { test: 'data' }
			};

			const expectedEvent: UsageEvent = {
				...event,
				timestamp: expect.any(Date)
			};

			mockAnalyticsRepository.trackEvent.mockResolvedValue(expectedEvent);

			// Act
			const result = await analyticsService.trackEvent(event);

			// Assert
			expect(mockAnalyticsRepository.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
				licenseId: event.licenseId,
				schoolId: event.schoolId,
				eventType: event.eventType,
				featureName: event.featureName,
				eventData: event.eventData
			}));
			expect(result).toEqual(expectedEvent);
		});

		it('should handle errors when tracking events', async () => {
			// Arrange
			const event = {
				licenseId: '123456789012345678901234',
				schoolId: 'school123',
				eventType: UsageEventType.FEATURE_ACCESS
			};

			const error = new Error('Database error');
			mockAnalyticsRepository.trackEvent.mockRejectedValue(error);

			// Act & Assert
			await expect(analyticsService.trackEvent(event)).rejects.toThrow(error);
		});
	});

	describe('trackFeatureUsage', () => {
		it('should track feature usage', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const schoolId = 'school123';
			const featureName = 'test-feature';
			const eventData = { test: 'data' };
			const clientInfo = { ip: '127.0.0.1' };

			const expectedEvent: UsageEvent = {
				licenseId,
				schoolId,
				eventType: UsageEventType.FEATURE_ACCESS,
				featureName,
				eventData,
				clientInfo,
				timestamp: expect.any(Date)
			};

			mockAnalyticsRepository.trackEvent.mockResolvedValue(expectedEvent);

			// Act
			const result = await analyticsService.trackFeatureUsage(
				licenseId,
				schoolId,
				featureName,
				eventData,
				clientInfo
			);

			// Assert
			expect(mockAnalyticsRepository.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
				licenseId,
				schoolId,
				eventType: UsageEventType.FEATURE_ACCESS,
				featureName,
				eventData,
				clientInfo
			}));
			expect(result).toEqual(expectedEvent);
		});
	});

	describe('trackLicenseValidation', () => {
		it('should track license validation', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const schoolId = 'school123';
			const success = true;
			const eventData = { test: 'data' };
			const clientInfo = { ip: '127.0.0.1' };

			const expectedEvent: UsageEvent = {
				licenseId,
				schoolId,
				eventType: UsageEventType.VALIDATION,
				eventData: { ...eventData, success },
				clientInfo,
				timestamp: expect.any(Date)
			};

			mockAnalyticsRepository.trackEvent.mockResolvedValue(expectedEvent);

			// Act
			const result = await analyticsService.trackLicenseValidation(
				licenseId,
				schoolId,
				success,
				eventData,
				clientInfo
			);

			// Assert
			expect(mockAnalyticsRepository.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
				licenseId,
				schoolId,
				eventType: UsageEventType.VALIDATION,
				eventData: expect.objectContaining({ success }),
				clientInfo
			}));
			expect(result).toEqual(expectedEvent);
		});
	});

	describe('getUsageReport', () => {
		it('should generate a usage report', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const mockLicense: License = {
				_id: licenseId,
				schoolId: 'school123',
				schoolName: 'Test School',
				licenseKey: 'test-key',
				licenseHash: 'test-hash',
				features: [],
				issuedAt: new Date(),
				expiresAt: new Date(),
				lastChecked: new Date(),
				status: LicenseStatus.ACTIVE,
				metadata: {},
				createdBy: 'test-user',
				updatedBy: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			const mockFeatureUsage = [
				{
					featureName: 'feature1',
					accessCount: 10,
					lastAccessed: new Date()
				},
				{
					featureName: 'feature2',
					accessCount: 5,
					lastAccessed: new Date()
				}
			];

			const mockDailyUsage = [
				{
					date: '2025-07-20',
					count: 8,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 5,
						[UsageEventType.API_CALL]: 3
					}
				},
				{
					date: '2025-07-21',
					count: 7,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 4,
						[UsageEventType.API_CALL]: 2,
						[UsageEventType.LOGIN]: 1
					}
				}
			];

			mockLicenseService.getLicense.mockResolvedValue(mockLicense);
			mockAnalyticsRepository.getFeatureUsage.mockResolvedValue(mockFeatureUsage);
			mockAnalyticsRepository.getDailyUsage.mockResolvedValue(mockDailyUsage);
			mockAnalyticsRepository.countEvents.mockResolvedValue(15);

			// Mock counts by event type
			Object.values(UsageEventType).forEach(eventType => {
				mockAnalyticsRepository.countEvents.mockResolvedValueOnce(
					eventType === UsageEventType.FEATURE_ACCESS ? 9 :
						eventType === UsageEventType.API_CALL ? 5 : 1
				);
			});

			// Act
			const report = await analyticsService.getUsageReport(licenseId);

			// Assert
			expect(mockLicenseService.getLicense).toHaveBeenCalledWith(licenseId);
			expect(mockAnalyticsRepository.getFeatureUsage).toHaveBeenCalledWith(licenseId, expect.any(Object));
			expect(mockAnalyticsRepository.getDailyUsage).toHaveBeenCalledWith(licenseId, expect.any(Object));

			expect(report).toEqual(expect.objectContaining({
				licenseId,
				schoolId: mockLicense.schoolId,
				schoolName: mockLicense.schoolName,
				period: expect.any(Object),
				summary: expect.objectContaining({
					totalEvents: 15,
					uniqueFeatures: 2,
					eventsByType: expect.any(Object)
				}),
				featureUsage: mockFeatureUsage,
				dailyUsage: mockDailyUsage
			}));
		});

		it('should throw an error if license is not found', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			mockLicenseService.getLicense.mockResolvedValue(null);

			// Act & Assert
			await expect(analyticsService.getUsageReport(licenseId)).rejects.toThrow(`License not found: ${licenseId}`);
		});
	});

	describe('getFeatureUsageStats', () => {
		it('should return feature usage statistics', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const mockFeatureUsage = [
				{
					featureName: 'feature1',
					accessCount: 10,
					lastAccessed: new Date()
				},
				{
					featureName: 'feature2',
					accessCount: 5,
					lastAccessed: new Date()
				}
			];

			mockAnalyticsRepository.getFeatureUsage.mockResolvedValue(mockFeatureUsage);

			// Act
			const result = await analyticsService.getFeatureUsageStats(licenseId);

			// Assert
			expect(mockAnalyticsRepository.getFeatureUsage).toHaveBeenCalledWith(licenseId, undefined);
			expect(result).toEqual(mockFeatureUsage);
		});
	});

	describe('getDailyUsageStats', () => {
		it('should return daily usage statistics', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const mockDailyUsage = [
				{
					date: '2025-07-20',
					count: 8,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 5,
						[UsageEventType.API_CALL]: 3
					}
				},
				{
					date: '2025-07-21',
					count: 7,
					byEventType: {
						[UsageEventType.FEATURE_ACCESS]: 4,
						[UsageEventType.API_CALL]: 2,
						[UsageEventType.LOGIN]: 1
					}
				}
			];

			mockAnalyticsRepository.getDailyUsage.mockResolvedValue(mockDailyUsage);

			// Act
			const result = await analyticsService.getDailyUsageStats(licenseId);

			// Assert
			expect(mockAnalyticsRepository.getDailyUsage).toHaveBeenCalledWith(licenseId, undefined);
			expect(result).toEqual(mockDailyUsage);
		});
	});

	describe('getMostUsedFeatures', () => {
		it('should return most used features', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const mockFeatureUsage = [
				{
					featureName: 'feature1',
					accessCount: 10,
					lastAccessed: new Date()
				},
				{
					featureName: 'feature2',
					accessCount: 5,
					lastAccessed: new Date()
				},
				{
					featureName: 'feature3',
					accessCount: 15,
					lastAccessed: new Date()
				}
			];

			mockAnalyticsRepository.getFeatureUsage.mockResolvedValue(mockFeatureUsage);

			// Act
			const result = await analyticsService.getMostUsedFeatures(licenseId, 2);

			// Assert
			expect(mockAnalyticsRepository.getFeatureUsage).toHaveBeenCalledWith(licenseId);
			expect(result).toHaveLength(2);
			expect(result[0].featureName).toBe('feature3'); // Most used
			expect(result[1].featureName).toBe('feature1'); // Second most used
		});
	});

	describe('getLicenseUsageTrends', () => {
		it('should return license usage trends', async () => {
			// Arrange
			const licenseId = '123456789012345678901234';
			const mockDailyUsage = [
				{
					date: '2025-07-10',
					count: 8,
					byEventType: { [UsageEventType.FEATURE_ACCESS]: 8 }
				},
				{
					date: '2025-07-11',
					count: 10,
					byEventType: { [UsageEventType.FEATURE_ACCESS]: 10 }
				}
			];

			mockAnalyticsRepository.getDailyUsage.mockResolvedValue(mockDailyUsage);

			// Act
			const result = await analyticsService.getLicenseUsageTrends(licenseId, 7);

			// Assert
			expect(mockAnalyticsRepository.getDailyUsage).toHaveBeenCalledWith(
				licenseId,
				expect.objectContaining({
					startDate: expect.any(Date),
					endDate: expect.any(Date)
				})
			);
			expect(result).toEqual([
				{ date: '2025-07-10', count: 8 },
				{ date: '2025-07-11', count: 10 }
			]);
		});
	});
});