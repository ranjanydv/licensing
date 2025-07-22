/**
 * License usage event types
 */
export enum UsageEventType {
  LOGIN = 'login',
  FEATURE_ACCESS = 'feature_access',
  API_CALL = 'api_call',
  VALIDATION = 'validation',
  ERROR = 'error',
  CUSTOM = 'custom'
}

/**
 * License usage event interface
 */
export interface UsageEvent {
  _id?: string;
  licenseId: string;
  schoolId: string;
  eventType: UsageEventType;
  featureName?: string;
  eventData?: Record<string, any>;
  timestamp: Date;
  clientInfo?: {
    ip?: string;
    userAgent?: string;
    deviceId?: string;
  };
}

/**
 * Usage analytics report interface
 */
export interface UsageAnalyticsReport {
  licenseId: string;
  schoolId: string;
  schoolName: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    uniqueFeatures: number;
    activeUsers?: number;
    eventsByType: Record<string, number>;
  };
  featureUsage: Array<{
    featureName: string;
    accessCount: number;
    uniqueUsers?: number;
    lastAccessed: Date;
  }>;
  dailyUsage: Array<{
    date: string;
    count: number;
    byEventType: Record<string, number>;
  }>;
}

/**
 * Analytics query options interface
 */
export interface AnalyticsQueryOptions {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: UsageEventType[];
  features?: string[];
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
}

/**
 * Analytics repository interface
 */
export interface IAnalyticsRepository {
  trackEvent(event: UsageEvent): Promise<UsageEvent>;
  findEvents(filter: Partial<UsageEvent>, options?: AnalyticsQueryOptions): Promise<UsageEvent[]>;
  countEvents(filter: Partial<UsageEvent>, options?: AnalyticsQueryOptions): Promise<number>;
  getFeatureUsage(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
    featureName: string;
    accessCount: number;
    lastAccessed: Date;
  }>>;
  getDailyUsage(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
    date: string;
    count: number;
    byEventType: Record<string, number>;
  }>>;
}

/**
 * Analytics service interface
 */
export interface IAnalyticsService {
  trackEvent(event: Partial<UsageEvent>): Promise<UsageEvent>;
  trackFeatureUsage(licenseId: string, schoolId: string, featureName: string, eventData?: Record<string, any>, clientInfo?: UsageEvent['clientInfo']): Promise<UsageEvent>;
  trackLicenseValidation(licenseId: string, schoolId: string, success: boolean, eventData?: Record<string, any>, clientInfo?: UsageEvent['clientInfo']): Promise<UsageEvent>;
  getUsageReport(licenseId: string, options?: AnalyticsQueryOptions): Promise<UsageAnalyticsReport>;
  getFeatureUsageStats(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
    featureName: string;
    accessCount: number;
    lastAccessed: Date;
  }>>;
  getDailyUsageStats(licenseId: string, options?: AnalyticsQueryOptions): Promise<Array<{
    date: string;
    count: number;
    byEventType: Record<string, number>;
  }>>;
  getMostUsedFeatures(licenseId: string, limit?: number): Promise<Array<{
    featureName: string;
    accessCount: number;
  }>>;
  getLicenseUsageTrends(licenseId: string, days?: number): Promise<Array<{
    date: string;
    count: number;
  }>>;
}