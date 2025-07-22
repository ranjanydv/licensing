import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import UsageEventModel from '../models/usage-event.model';
import { UsageEvent, UsageEventType } from '../interfaces/analytics.interface';
import { addDays, subDays } from 'date-fns';

describe('AnalyticsRepository', () => {
  let mongoServer: MongoMemoryServer;
  let analyticsRepository: AnalyticsRepository;
  
  beforeAll(async () => {
    // Set up the in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create repository instance
    analyticsRepository = new AnalyticsRepository();
  });
  
  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await UsageEventModel.deleteMany({});
  });
  
  describe('trackEvent', () => {
    it('should track a usage event', async () => {
      // Arrange
      const event: UsageEvent = {
        licenseId: '123456789012345678901234',
        schoolId: 'school123',
        eventType: UsageEventType.FEATURE_ACCESS,
        featureName: 'test-feature',
        eventData: { test: 'data' },
        timestamp: new Date(),
        clientInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          deviceId: 'test-device'
        }
      };
      
      // Act
      const result = await analyticsRepository.trackEvent(event);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.licenseId).toBe(event.licenseId);
      expect(result.schoolId).toBe(event.schoolId);
      expect(result.eventType).toBe(event.eventType);
      expect(result.featureName).toBe(event.featureName);
      expect(result.eventData).toEqual(event.eventData);
      expect(result.clientInfo).toEqual(event.clientInfo);
      
      // Verify it was saved to the database
      const savedEvent = await UsageEventModel.findById(result._id);
      expect(savedEvent).toBeDefined();
      expect(savedEvent!.licenseId).toBe(event.licenseId);
    });
  });
  
  describe('findEvents', () => {
    it('should find events based on filter criteria', async () => {
      // Arrange
      const licenseId = '123456789012345678901234';
      const events: UsageEvent[] = [
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: new Date()
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.API_CALL,
          featureName: 'feature2',
          timestamp: new Date()
        },
        {
          licenseId: 'different-license',
          schoolId: 'school456',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: new Date()
        }
      ];
      
      // Save events to database
      for (const event of events) {
        await analyticsRepository.trackEvent(event);
      }
      
      // Act
      const results = await analyticsRepository.findEvents({ licenseId });
      
      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].licenseId).toBe(licenseId);
      expect(results[1].licenseId).toBe(licenseId);
    });
    
    it('should filter events by date range', async () => {
      // Arrange
      const licenseId = '123456789012345678901234';
      const now = new Date();
      const events: UsageEvent[] = [
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: subDays(now, 10) // 10 days ago
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.API_CALL,
          featureName: 'feature2',
          timestamp: subDays(now, 5) // 5 days ago
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.LOGIN,
          featureName: 'feature3',
          timestamp: subDays(now, 1) // 1 day ago
        }
      ];
      
      // Save events to database
      for (const event of events) {
        await analyticsRepository.trackEvent(event);
      }
      
      // Act
      const results = await analyticsRepository.findEvents(
        { licenseId },
        { 
          startDate: subDays(now, 7),
          endDate: now
        }
      );
      
      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].featureName).toBe('feature3');
      expect(results[1].featureName).toBe('feature2');
    });
  });
  
  describe('countEvents', () => {
    it('should count events based on filter criteria', async () => {
      // Arrange
      const licenseId = '123456789012345678901234';
      const events: UsageEvent[] = [
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: new Date()
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.API_CALL,
          featureName: 'feature2',
          timestamp: new Date()
        },
        {
          licenseId: 'different-license',
          schoolId: 'school456',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: new Date()
        }
      ];
      
      // Save events to database
      for (const event of events) {
        await analyticsRepository.trackEvent(event);
      }
      
      // Act
      const count = await analyticsRepository.countEvents({ licenseId });
      
      // Assert
      expect(count).toBe(2);
    });
  });
  
  describe('getFeatureUsage', () => {
    it('should return feature usage statistics', async () => {
      // Arrange
      const licenseId = '123456789012345678901234';
      const now = new Date();
      const events: UsageEvent[] = [
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: subDays(now, 5)
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: subDays(now, 3)
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature2',
          timestamp: subDays(now, 2)
        },
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.API_CALL,
          featureName: 'feature1',
          timestamp: subDays(now, 1)
        }
      ];
      
      // Save events to database
      for (const event of events) {
        await analyticsRepository.trackEvent(event);
      }
      
      // Act
      const results = await analyticsRepository.getFeatureUsage(licenseId);
      
      // Assert
      expect(results).toHaveLength(2);
      
      // Feature1 should have 3 accesses
      const feature1 = results.find(f => f.featureName === 'feature1');
      expect(feature1).toBeDefined();
      expect(feature1!.accessCount).toBe(3);
      
      // Feature2 should have 1 access
      const feature2 = results.find(f => f.featureName === 'feature2');
      expect(feature2).toBeDefined();
      expect(feature2!.accessCount).toBe(1);
    });
  });
  
  describe('getDailyUsage', () => {
    it('should return daily usage statistics', async () => {
      // Arrange
      const licenseId = '123456789012345678901234';
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = subDays(today, 1);
      
      const events: UsageEvent[] = [
        // Today - Feature Access
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: today
        },
        // Today - API Call
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.API_CALL,
          featureName: 'feature2',
          timestamp: today
        },
        // Yesterday - Feature Access
        {
          licenseId,
          schoolId: 'school123',
          eventType: UsageEventType.FEATURE_ACCESS,
          featureName: 'feature1',
          timestamp: yesterday
        }
      ];
      
      // Save events to database
      for (const event of events) {
        await analyticsRepository.trackEvent(event);
      }
      
      // Act
      const results = await analyticsRepository.getDailyUsage(licenseId);
      
      // Assert
      expect(results).toHaveLength(2); // Two days with events
      
      // Find today's stats
      const todayFormatted = today.toISOString().split('T')[0];
      const todayStats = results.find(day => day.date === todayFormatted);
      expect(todayStats).toBeDefined();
      expect(todayStats!.count).toBe(2);
      expect(todayStats!.byEventType[UsageEventType.FEATURE_ACCESS]).toBe(1);
      expect(todayStats!.byEventType[UsageEventType.API_CALL]).toBe(1);
      
      // Find yesterday's stats
      const yesterdayFormatted = yesterday.toISOString().split('T')[0];
      const yesterdayStats = results.find(day => day.date === yesterdayFormatted);
      expect(yesterdayStats).toBeDefined();
      expect(yesterdayStats!.count).toBe(1);
      expect(yesterdayStats!.byEventType[UsageEventType.FEATURE_ACCESS]).toBe(1);
    });
  });
});