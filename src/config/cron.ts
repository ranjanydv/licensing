/**
 * Cron job configuration for new licensing system
 */
export const cronConfig = {
  // Health check every 6 hours
  healthCheck: '0 */6 * * *',
  
  // Clean up expired licenses weekly
  cleanupExpiredLicenses: '0 2 * * 0',
  
  // System maintenance daily
  systemMaintenance: '0 3 * * *'
};

export default cronConfig;