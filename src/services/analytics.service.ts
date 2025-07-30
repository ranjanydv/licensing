// import { 
//   IAnalyticsService, 
//   UsageEvent, 
//   UsageEventType, 
//   AnalyticsQueryOptions, 
//   UsageAnalyticsReport 
// } from '../interfaces/analytics.interface';
// import { AnalyticsRepository } from '../repositories/analytics.repository';
// import { LicenseService } from './license.service';
// import { subDays } from 'date-fns';
// import { Logger } from '../utils/logger';

// /**
//  * Service for license usage analytics
//  */
// export class AnalyticsService implements IAnalyticsService {
//   private logger = new Logger('AnalyticsService');
  
//   /**
//    * Create a new analytics service
//    * @param analyticsRepository Repository for analytics data
//    * @param licenseService License service for license data
//    */
//   constructor(
//     private analyticsRepository: AnalyticsRepository,
//     private licenseService: LicenseService
//   ) {}

//   /**
//    * Track a usage event
//    * @param event Partial usage event
//    * @returns Tracked usage event
//    */
//   async trackEvent(event: Partial<UsageEvent>): Promise<UsageEvent> {
//     try {
//       const fullEvent: UsageEvent = {
//         licenseId: event.licenseId!,
//         schoolId: event.schoolId!,
//         eventType: event.eventType || UsageEventType.CUSTOM,
//         featureName: event.featureName,
//         eventData: event.eventData || {},
//         timestamp: event.timestamp || new Date(),
//         clientInfo: event.clientInfo
//       };

//       return await this.analyticsRepository.trackEvent(fullEvent);
//     } catch (error) {
//       this.logger.error('Failed to track event', { error, event });
//       throw error;
//     }
//   }

//   /**
//    * Track feature usage
//    * @param licenseId License ID
//    * @param schoolId School ID
//    * @param featureName Feature name
//    * @param eventData Additional event data
//    * @param clientInfo Client information
//    * @returns Tracked usage event
//    */
//   async trackFeatureUsage(
//     licenseId: string, 
//     schoolId: string, 
//     featureName: string, 
//     eventData?: Record<string, any>,
//     clientInfo?: UsageEvent['clientInfo']
//   ): Promise<UsageEvent> {
//     return this.trackEvent({
//       licenseId,
//       schoolId,
//       eventType: UsageEventType.FEATURE_ACCESS,
//       featureName,
//       eventData,
//       clientInfo
//     });
//   }

//   /**
//    * Track license validation
//    * @param licenseId License ID
//    * @param schoolId School ID
//    * @param success Whether validation was successful
//    * @param eventData Additional event data
//    * @param clientInfo Client information
//    * @returns Tracked usage event
//    */
//   async trackLicenseValidation(
//     licenseId: string,
//     schoolId: string,
//     success: boolean,
//     eventData?: Record<string, any>,
//     clientInfo?: UsageEvent['clientInfo']
//   ): Promise<UsageEvent> {
//     return this.trackEvent({
//       licenseId,
//       schoolId,
//       eventType: UsageEventType.VALIDATION,
//       eventData: {
//         ...eventData,
//         success
//       },
//       clientInfo
//     });
//   }

//   /**
//    * Get usage report for a license
//    * @param licenseId License ID
//    * @param options Query options
//    * @returns Usage analytics report
//    */
//   async getUsageReport(licenseId: string, options?: AnalyticsQueryOptions): Promise<UsageAnalyticsReport> {
//     try {
//       // Get license details
//       const license = await this.licenseService.getLicense(licenseId);
//       if (!license) {
//         throw new Error(`License not found: ${licenseId}`);
//       }

//       // Set default date range if not provided
//       const endDate = options?.endDate || new Date();
//       const startDate = options?.startDate || subDays(endDate, 30);

//       // Get feature usage statistics
//       const featureUsage = await this.getFeatureUsageStats(licenseId, {
//         ...options,
//         startDate,
//         endDate
//       });

//       // Get daily usage statistics
//       const dailyUsage = await this.getDailyUsageStats(licenseId, {
//         ...options,
//         startDate,
//         endDate
//       });

//       // Count total events
//       const totalEvents = await this.analyticsRepository.countEvents(
//         { licenseId },
//         { startDate, endDate, eventTypes: options?.eventTypes }
//       );

//       // Count events by type
//       const eventsByType: Record<string, number> = {};
//       for (const eventType of Object.values(UsageEventType)) {
//         const count = await this.analyticsRepository.countEvents(
//           { licenseId, eventType },
//           { startDate, endDate }
//         );
//         eventsByType[eventType] = count;
//       }

//       // Create the report
//       const report: UsageAnalyticsReport = {
//         licenseId,
//         schoolId: license.schoolId,
//         schoolName: license.schoolName,
//         period: {
//           start: startDate,
//           end: endDate
//         },
//         summary: {
//           totalEvents,
//           uniqueFeatures: featureUsage.length,
//           eventsByType
//         },
//         featureUsage,
//         dailyUsage
//       };

//       return report;
//     } catch (error) {
//       this.logger.error('Failed to generate usage report', { error, licenseId });
//       throw error;
//     }
//   }

//   /**
//    * Get feature usage statistics
//    * @param licenseId License ID
//    * @param options Query options
//    * @returns Feature usage statistics
//    */
//   async getFeatureUsageStats(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
//     featureName: string;
//     accessCount: number;
//     lastAccessed: Date;
//   }>> {
//     return this.analyticsRepository.getFeatureUsage(licenseId, options);
//   }

//   /**
//    * Get daily usage statistics
//    * @param licenseId License ID
//    * @param options Query options
//    * @returns Daily usage statistics
//    */
//   async getDailyUsageStats(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
//     date: string;
//     count: number;
//     byEventType: Record<string, number>;
//   }>> {
//     return this.analyticsRepository.getDailyUsage(licenseId, options);
//   }

//   /**
//    * Get most used features
//    * @param licenseId License ID
//    * @param limit Maximum number of features to return
//    * @returns Most used features
//    */
//   async getMostUsedFeatures(licenseId: string, limit: number = 5): Promise<Array<{
//     featureName: string;
//     accessCount: number;
//   }>> {
//     const featureUsage = await this.getFeatureUsageStats(licenseId);
//     return featureUsage
//       .sort((a, b) => b.accessCount - a.accessCount)
//       .slice(0, limit)
//       .map(({ featureName, accessCount }) => ({ featureName, accessCount }));
//   }

//   /**
//    * Get license usage trends
//    * @param licenseId License ID
//    * @param days Number of days to include
//    * @returns Daily usage counts
//    */
//   async getLicenseUsageTrends(licenseId: string, days: number = 30): Promise<Array<{
//     date: string;
//     count: number;
//   }>> {
//     const endDate = new Date();
//     const startDate = subDays(endDate, days);
    
//     const dailyUsage = await this.getDailyUsageStats(licenseId, { startDate, endDate });
    
//     return dailyUsage.map(({ date, count }) => ({ date, count }));
//   }
// }