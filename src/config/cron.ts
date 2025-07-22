/**
 * Cron job configuration
 */
export const cronConfig = {
  // Daily license check at 1:00 AM
  dailyLicenseCheck: '0 1 * * *',
  
  // Retry failed checks every 4 hours
  retryFailedChecks: '0 */4 * * *',
  
  // Generate expiration report every Monday at 9:00 AM
  expirationReport: '0 9 * * 1',
  
  // License expiration warning thresholds (in days)
  expirationWarningThresholds: [30, 15, 7, 3, 1]
};

export default cronConfig;