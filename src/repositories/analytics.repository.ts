// import { UsageEvent, IAnalyticsRepository, AnalyticsQueryOptions } from '../interfaces/analytics.interface';
// import UsageEventModel from '../models/usage-event.model';
// import { startOfDay, endOfDay, format } from 'date-fns';

// /**
//  * Repository for license usage analytics
//  */
// export class AnalyticsRepository implements IAnalyticsRepository {
//   /**
//    * Track a usage event
//    * @param event Usage event to track
//    * @returns Tracked usage event
//    */
//   async trackEvent(event: UsageEvent): Promise<UsageEvent> {
//     const newEvent = new UsageEventModel(event);
//     await newEvent.save();
//     return newEvent.toObject();
//   }

//   /**
//    * Find usage events
//    * @param filter Filter criteria
//    * @param options Query options
//    * @returns Array of usage events
//    */
//   async findEvents(filter: Partial<UsageEvent>, options?: AnalyticsQueryOptions): Promise<UsageEvent[]> {
//     const query = UsageEventModel.find(this.buildFilter(filter, options));

//     if (options?.limit) {
//       query.limit(options.limit);
//     }

//     query.sort({ timestamp: -1 });

//     return await query.lean();
//   }

//   /**
//    * Count usage events
//    * @param filter Filter criteria
//    * @param options Query options
//    * @returns Count of usage events
//    */
//   async countEvents(filter: Partial<UsageEvent>, options?: AnalyticsQueryOptions): Promise<number> {
//     return await UsageEventModel.countDocuments(this.buildFilter(filter, options));
//   }

//   /**
//    * Get feature usage statistics
//    * @param licenseId License ID
//    * @param options Query options
//    * @returns Array of feature usage statistics
//    */
//   async getFeatureUsage(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
//     featureName: string;
//     accessCount: number;
//     lastAccessed: Date;
//   }>> {
//     const filter = this.buildFilter({ licenseId }, options);
//     filter.featureName = { $exists: true, $ne: null };

//     const result = await UsageEventModel.aggregate([
//       { $match: filter },
//       { 
//         $group: {
//           _id: '$featureName',
//           accessCount: { $sum: 1 },
//           lastAccessed: { $max: '$timestamp' }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           featureName: '$_id',
//           accessCount: 1,
//           lastAccessed: 1
//         }
//       },
//       { $sort: { accessCount: -1 } }
//     ]);

//     return result;
//   }

//   /**
//    * Get daily usage statistics
//    * @param licenseId License ID
//    * @param options Query options
//    * @returns Array of daily usage statistics
//    */
//   async getDailyUsage(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
//     date: string;
//     count: number;
//     byEventType: Record<string, number>;
//   }>> {
//     const filter = this.buildFilter({ licenseId }, options);
    
//     const result = await UsageEventModel.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: {
//             date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
//             eventType: '$eventType'
//           },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: '$_id.date',
//           totalCount: { $sum: '$count' },
//           eventTypes: {
//             $push: {
//               eventType: '$_id.eventType',
//               count: '$count'
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           date: '$_id',
//           count: '$totalCount',
//           byEventType: {
//             $arrayToObject: {
//               $map: {
//                 input: '$eventTypes',
//                 as: 'eventType',
//                 in: [
//                   '$$eventType.eventType',
//                   '$$eventType.count'
//                 ]
//               }
//             }
//           }
//         }
//       },
//       { $sort: { date: 1 } }
//     ]);

//     return result;
//   }

//   /**
//    * Build filter for MongoDB queries
//    * @param filter Base filter
//    * @param options Query options
//    * @returns MongoDB filter
//    */
//   private buildFilter(filter: Partial<UsageEvent>, options?: AnalyticsQueryOptions): Record<string, any> {
//     const queryFilter: Record<string, any> = { ...filter };

//     if (options?.startDate || options?.endDate) {
//       queryFilter.timestamp = {};
      
//       if (options.startDate) {
//         queryFilter.timestamp.$gte = startOfDay(options.startDate);
//       }
      
//       if (options.endDate) {
//         queryFilter.timestamp.$lte = endOfDay(options.endDate);
//       }
//     }

//     if (options?.eventTypes && options.eventTypes.length > 0) {
//       queryFilter.eventType = { $in: options.eventTypes };
//     }

//     if (options?.features && options.features.length > 0) {
//       queryFilter.featureName = { $in: options.features };
//     }

//     return queryFilter;
//   }
// }