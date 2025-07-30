import cron from 'node-cron';
import { Logger } from '../utils/logger';
import { notificationService, AlertSeverity } from '../services/notification.service';
import { cronConfig } from '../config/cron';

const logger = new Logger('Cron');

// Store active cron jobs for management
export const activeCronJobs = new Map<string, cron.ScheduledTask>();

/**
 * System health check
 */
export const performHealthCheck = async (): Promise<void> => {
  const taskName = 'healthCheck';
  try {
    logger.info('Running system health check');
    
    // Add health check logic here
    // - Database connectivity
    // - API endpoint availability
    // - System resource usage
    
    logger.info('System health check completed');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in system health check:', { error: errorMessage });
    
    await notificationService.sendAdminAlert(
      `System health check failed: ${errorMessage}`,
      AlertSeverity.MEDIUM
    );
    
    throw error;
  }
};

/**
 * Clean up expired licenses
 */
export const cleanupExpiredLicenses = async (): Promise<void> => {
  const taskName = 'cleanupExpiredLicenses';
  try {
    logger.info('Running expired license cleanup');
    
    // Add cleanup logic here
    // - Archive expired licenses
    // - Clean up old audit logs
    // - Optimize database
    
    logger.info('Expired license cleanup completed');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in expired license cleanup:', { error: errorMessage });
    
    await notificationService.sendAdminAlert(
      `Expired license cleanup failed: ${errorMessage}`,
      AlertSeverity.MEDIUM
    );
    
    throw error;
  }
};

/**
 * System maintenance
 */
export const performSystemMaintenance = async (): Promise<void> => {
  const taskName = 'systemMaintenance';
  try {
    logger.info('Running system maintenance');
    
    // Add maintenance logic here
    // - Database optimization
    // - Log rotation
    // - Cache cleanup
    
    logger.info('System maintenance completed');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in system maintenance:', { error: errorMessage });
    
    await notificationService.sendAdminAlert(
      `System maintenance failed: ${errorMessage}`,
      AlertSeverity.MEDIUM
    );
    
    throw error;
  }
};

/**
 * Execute a cron task with error handling
 * @param taskName Name of the task
 * @param taskFn Function to execute
 */
export const executeCronTask = async (taskName: string, taskFn: () => Promise<any>): Promise<void> => {
  try {
    logger.info(`Running scheduled task: ${taskName}`);
    await taskFn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in scheduled task ${taskName}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};

/**
 * Set up cron jobs
 */
export const setupCronJobs = (): void => {
  // Health check every 6 hours
  const healthCheckJob = cron.schedule(cronConfig.healthCheck, async () => {
    await executeCronTask('healthCheck', performHealthCheck);
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // Clean up expired licenses weekly
  const cleanupJob = cron.schedule(cronConfig.cleanupExpiredLicenses, async () => {
    await executeCronTask('cleanupExpiredLicenses', cleanupExpiredLicenses);
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // System maintenance daily
  const maintenanceJob = cron.schedule(cronConfig.systemMaintenance, async () => {
    await executeCronTask('systemMaintenance', performSystemMaintenance);
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // Store active jobs
  activeCronJobs.set('healthCheck', healthCheckJob);
  activeCronJobs.set('cleanupExpiredLicenses', cleanupJob);
  activeCronJobs.set('systemMaintenance', maintenanceJob);
  
  logger.info('Cron jobs scheduled successfully', {
    jobs: Array.from(activeCronJobs.keys())
  });
};

/**
 * Stop all cron jobs
 * Useful for graceful shutdown or testing
 */
export const stopAllCronJobs = (): void => {
  for (const [name, job] of activeCronJobs.entries()) {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  }

  activeCronJobs.clear();
  logger.info('All cron jobs stopped');
};

/**
 * Get status of all cron jobs
 * @returns Status of all cron jobs
 */
export const getCronJobsStatus = (): Array<{
  name: string;
  nextRun: Date | null;
  lastRun: Date | null;
  status: 'active' | 'stopped';
}> => {
  const status = [];

  for (const [name, job] of activeCronJobs.entries()) {
    status.push({
      name,
      nextRun: null, // node-cron does not support next run time
      lastRun: null,
      status: 'active' as const
    });
  }

  return status;
};

export default setupCronJobs;