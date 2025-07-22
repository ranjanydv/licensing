import cron from 'node-cron';
import { Logger } from '../utils/logger';
import { licenseService } from '../services/license.service';
import { notificationService, AlertSeverity } from '../services/notification.service';
import { LicenseCheckReport, LicenseStatus } from '../interfaces/license.interface';
import { cronConfig } from '../config/cron';

const logger = new Logger('Cron');

// Store active cron jobs for management and testing
export const activeCronJobs = new Map<string, cron.ScheduledTask>();

// Store failed tasks for retry mechanism
export const failedTasks = new Map<string, { 
  taskName: string, 
  failCount: number, 
  lastError: Error, 
  lastAttempt: Date 
}>();

// Maximum retry attempts before alerting administrators
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Check all licenses for expiration
 * @returns License check report
 */
export const checkLicenses = async (): Promise<LicenseCheckReport> => {
  const taskName = 'dailyLicenseCheck';
  try {
    logger.info('Running daily license check');
    
    // Check all licenses
    const report = await licenseService.checkLicenses();
    
    // Log report summary
    logger.info('License check completed', {
      totalChecked: report.totalChecked,
      active: report.active,
      expired: report.expired,
      revoked: report.revoked,
      failed: report.failed
    });
    
    // Clear from failed tasks if it was previously failed
    if (failedTasks.has(taskName)) {
      failedTasks.delete(taskName);
      logger.info(`Task ${taskName} recovered successfully`);
    }
    
    return report;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in daily license check:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    // Track failed task for retry
    recordFailedTask(taskName, error as Error);
    
    throw error;
  }
};

/**
 * Retry failed license checks
 * @returns Number of retried checks
 */
export const retryFailedChecks = async (): Promise<number> => {
  const taskName = 'retryFailedChecks';
  try {
    logger.info('Retrying failed license checks');
    
    // Retry failed checks
    const retriedCount = await licenseService.retryFailedChecks();
    
    logger.info(`Retried ${retriedCount} failed license checks`);
    
    // Clear from failed tasks if it was previously failed
    if (failedTasks.has(taskName)) {
      failedTasks.delete(taskName);
      logger.info(`Task ${taskName} recovered successfully`);
    }
    
    return retriedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in retry failed checks:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    // Track failed task for retry
    recordFailedTask(taskName, error as Error);
    
    throw error;
  }
};

/**
 * Generate license expiration report
 * Finds licenses expiring in the next 30 days
 */
export const generateExpirationReport = async (): Promise<void> => {
  const taskName = 'expirationReport';
  try {
    logger.info('Generating license expiration report');
    
    // Get licenses expiring in the next 30 days
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringLicenses = await licenseService.getAllLicenses({
      status: LicenseStatus.ACTIVE,
      expiresAt: thirtyDaysFromNow
    } as any); // Using 'as any' to bypass TypeScript's type checking for MongoDB queries
    
    logger.info(`Found ${expiringLicenses.length} licenses expiring in the next 30 days`);
    
    // In a real system, you would send this report via email or store it
    // For now, we just log it
    if (expiringLicenses.length > 0) {
      logger.info('Expiring licenses:', {
        licenses: expiringLicenses.map(license => ({
          id: license._id,
          schoolId: license.schoolId,
          schoolName: license.schoolName,
          expiresAt: license.expiresAt
        }))
      });
    }
    
    // Clear from failed tasks if it was previously failed
    if (failedTasks.has(taskName)) {
      failedTasks.delete(taskName);
      logger.info(`Task ${taskName} recovered successfully`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error generating expiration report:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    // Track failed task for retry
    recordFailedTask(taskName, error as Error);
  }
};

/**
 * Record a failed task for retry
 * @param taskName Name of the failed task
 * @param error Error that occurred
 */
export const recordFailedTask = (taskName: string, error: Error): void => {
  const now = new Date();
  
  // Check if task has failed before
  if (failedTasks.has(taskName)) {
    const failedTask = failedTasks.get(taskName)!;
    failedTask.failCount += 1;
    failedTask.lastError = error;
    failedTask.lastAttempt = now;
    
    // Alert administrators if max retry attempts reached
    if (failedTask.failCount >= MAX_RETRY_ATTEMPTS) {
      const severity = failedTask.failCount >= MAX_RETRY_ATTEMPTS * 2 
        ? AlertSeverity.HIGH 
        : AlertSeverity.MEDIUM;
      
      notificationService.sendAdminAlert(
        `Task ${taskName} has failed ${failedTask.failCount} times. Last error: ${error.message}`,
        severity
      );
    }
  } else {
    // First failure of this task
    failedTasks.set(taskName, {
      taskName,
      failCount: 1,
      lastError: error,
      lastAttempt: now
    });
  }
  
  logger.warn(`Task ${taskName} failed and added to retry queue`, { 
    failCount: failedTasks.get(taskName)!.failCount 
  });
};

/**
 * Execute a cron task with error handling and retry tracking
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
 * Manually trigger a retry of failed tasks
 * Useful for immediate retry without waiting for the scheduled retry
 */
export const manualRetryFailedTasks = async (): Promise<void> => {
  if (failedTasks.size === 0) {
    logger.info('No failed tasks to retry');
    return;
  }
  
  logger.info(`Manually retrying ${failedTasks.size} failed tasks`);
  
  for (const [taskName, failedTask] of failedTasks.entries()) {
    logger.info(`Retrying failed task: ${taskName}`);
    
    try {
      switch (taskName) {
        case 'dailyLicenseCheck':
          await checkLicenses();
          break;
        case 'retryFailedChecks':
          await retryFailedChecks();
          break;
        case 'expirationReport':
          await generateExpirationReport();
          break;
        default:
          logger.warn(`Unknown task name: ${taskName}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Manual retry of task ${taskName} failed:`, { 
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      });
    }
  }
};

/**
 * Set up cron jobs
 */
export const setupCronJobs = (): void => {
  // Daily license check
  const dailyLicenseCheckJob = cron.schedule(cronConfig.dailyLicenseCheck, async () => {
    await executeCronTask('dailyLicenseCheck', checkLicenses);
  }, {
    scheduled: true,
    timezone: 'UTC' // Use UTC for consistency across deployments
  });
  
  // Retry failed checks
  const retryFailedChecksJob = cron.schedule(cronConfig.retryFailedChecks, async () => {
    await executeCronTask('retryFailedChecks', retryFailedChecks);
    
    // Also retry any other failed tasks
    if (failedTasks.size > 0) {
      logger.info(`Found ${failedTasks.size} failed tasks to retry`);
      await manualRetryFailedTasks();
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // Generate expiration report
  const expirationReportJob = cron.schedule(cronConfig.expirationReport, async () => {
    await executeCronTask('expirationReport', generateExpirationReport);
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  // Store active jobs for management
  activeCronJobs.set('dailyLicenseCheck', dailyLicenseCheckJob);
  activeCronJobs.set('retryFailedChecks', retryFailedChecksJob);
  activeCronJobs.set('expirationReport', expirationReportJob);
  
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
  failCount: number;
}> => {
  const status = [];
  
  for (const [name, job] of activeCronJobs.entries()) {
    const failedTask = failedTasks.get(name);
    
    status.push({
      name,
      nextRun: null, // node-cron does not support next run time
      lastRun: failedTask?.lastAttempt || null,
      status: 'active' as const,
      failCount: failedTask?.failCount || 0
    });
  }
  
  return status;
};

export default setupCronJobs;