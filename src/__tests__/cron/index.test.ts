import { 
  checkLicenses, 
  retryFailedChecks, 
  generateExpirationReport, 
  setupCronJobs, 
  stopAllCronJobs,
  activeCronJobs,
  failedTasks,
  recordFailedTask,
  executeCronTask,
  manualRetryFailedTasks
} from '../../cron';
import { licenseService } from '../../services/license.service';
import { notificationService, AlertSeverity } from '../../services/notification.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import cron from 'node-cron';

// Type for mocking ScheduledTask
type MockScheduledTask = {
  stop: jest.Mock;
};

// Mock dependencies
jest.mock('../../services/license.service');
jest.mock('../../services/notification.service');
jest.mock('node-cron');

describe('Cron Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    failedTasks.clear();
    activeCronJobs.clear();
  });
  
  describe('checkLicenses', () => {
    it('should check all licenses and return a report', async () => {
      // Mock license service
      const mockReport = {
        totalChecked: 10,
        active: 7,
        expired: 2,
        revoked: 1,
        failed: 0,
        details: []
      };
      (licenseService.checkLicenses as jest.Mock).mockResolvedValue(mockReport);
      
      // Run license check
      const report = await checkLicenses();
      
      // Verify report
      expect(report).toEqual(mockReport);
      
      // Verify service was called
      expect(licenseService.checkLicenses).toHaveBeenCalled();
    });
    
    it('should propagate errors and record failed task', async () => {
      // Mock license service to throw error
      const error = new Error('Test error');
      (licenseService.checkLicenses as jest.Mock).mockRejectedValue(error);
      
      // Run license check and expect error
      await expect(checkLicenses()).rejects.toThrow('Test error');
      
      // Verify failed task was recorded
      expect(failedTasks.has('dailyLicenseCheck')).toBe(true);
      const failedTask = failedTasks.get('dailyLicenseCheck');
      expect(failedTask?.failCount).toBe(1);
      expect(failedTask?.lastError).toBe(error);
    });
    
    it('should clear failed task record on success after failure', async () => {
      // First record a failure
      const error = new Error('Test error');
      recordFailedTask('dailyLicenseCheck', error);
      
      // Then mock a successful execution
      const mockReport = {
        totalChecked: 10,
        active: 7,
        expired: 2,
        revoked: 1,
        failed: 0,
        details: []
      };
      (licenseService.checkLicenses as jest.Mock).mockResolvedValue(mockReport);
      
      // Run license check
      await checkLicenses();
      
      // Verify failed task was cleared
      expect(failedTasks.has('dailyLicenseCheck')).toBe(false);
    });
  });
  
  describe('retryFailedChecks', () => {
    it('should retry failed checks and return count', async () => {
      // Mock license service
      (licenseService.retryFailedChecks as jest.Mock).mockResolvedValue(3);
      
      // Run retry
      const count = await retryFailedChecks();
      
      // Verify count
      expect(count).toBe(3);
      
      // Verify service was called
      expect(licenseService.retryFailedChecks).toHaveBeenCalled();
    });
    
    it('should propagate errors and record failed task', async () => {
      // Mock license service to throw error
      const error = new Error('Test error');
      (licenseService.retryFailedChecks as jest.Mock).mockRejectedValue(error);
      
      // Run retry and expect error
      await expect(retryFailedChecks()).rejects.toThrow('Test error');
      
      // Verify failed task was recorded
      expect(failedTasks.has('retryFailedChecks')).toBe(true);
      const failedTask = failedTasks.get('retryFailedChecks');
      expect(failedTask?.failCount).toBe(1);
      expect(failedTask?.lastError).toBe(error);
    });
  });
  
  describe('generateExpirationReport', () => {
    it('should generate a report of expiring licenses', async () => {
      // Mock license service
      const mockExpiringLicenses = [
        {
          _id: 'license1',
          schoolId: 'school1',
          schoolName: 'School 1',
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          status: LicenseStatus.ACTIVE
        },
        {
          _id: 'license2',
          schoolId: 'school2',
          schoolName: 'School 2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: LicenseStatus.ACTIVE
        }
      ];
      (licenseService.getAllLicenses as jest.Mock).mockResolvedValue(mockExpiringLicenses);
      
      // Run report generation
      await generateExpirationReport();
      
      // Verify service was called with correct filter
      expect(licenseService.getAllLicenses).toHaveBeenCalledWith({
        status: 'active',
        expiresAt: expect.any(Object)
      });
    });
    
    it('should handle errors gracefully and record failed task', async () => {
      // Mock license service to throw error
      const error = new Error('Test error');
      (licenseService.getAllLicenses as jest.Mock).mockRejectedValue(error);
      
      // Run report generation and expect it not to throw
      await expect(generateExpirationReport()).resolves.not.toThrow();
      
      // Verify failed task was recorded
      expect(failedTasks.has('expirationReport')).toBe(true);
      const failedTask = failedTasks.get('expirationReport');
      expect(failedTask?.failCount).toBe(1);
      expect(failedTask?.lastError).toBe(error);
    });
  });
  
  describe('recordFailedTask', () => {
    it('should record a new failed task', () => {
      const error = new Error('Test error');
      recordFailedTask('testTask', error);
      
      expect(failedTasks.has('testTask')).toBe(true);
      const failedTask = failedTasks.get('testTask');
      expect(failedTask?.failCount).toBe(1);
      expect(failedTask?.lastError).toBe(error);
    });
    
    it('should increment fail count for existing failed task', () => {
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');
      
      recordFailedTask('testTask', error1);
      recordFailedTask('testTask', error2);
      
      expect(failedTasks.has('testTask')).toBe(true);
      const failedTask = failedTasks.get('testTask');
      expect(failedTask?.failCount).toBe(2);
      expect(failedTask?.lastError).toBe(error2);
    });
    
    it('should send alert when max retry attempts reached', () => {
      const error = new Error('Test error');
      
      // Record multiple failures to reach threshold
      for (let i = 0; i < 3; i++) {
        recordFailedTask('testTask', error);
      }
      
      // Verify alert was sent
      expect(notificationService.sendAdminAlert).toHaveBeenCalledWith(
        expect.stringContaining('testTask has failed 3 times'),
        AlertSeverity.MEDIUM
      );
    });
    
    it('should escalate severity for continued failures', () => {
      const error = new Error('Test error');
      
      // Record multiple failures to exceed threshold by 2x
      for (let i = 0; i < 6; i++) {
        recordFailedTask('testTask', error);
      }
      
      // Verify alert was sent with high severity
      expect(notificationService.sendAdminAlert).toHaveBeenCalledWith(
        expect.any(String),
        AlertSeverity.HIGH
      );
    });
  });
  
  describe('executeCronTask', () => {
    it('should execute the task function', async () => {
      const taskFn = jest.fn().mockResolvedValue('result');
      
      await executeCronTask('testTask', taskFn);
      
      expect(taskFn).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      const taskFn = jest.fn().mockRejectedValue(error);
      
      // Should not throw
      await expect(executeCronTask('testTask', taskFn)).resolves.not.toThrow();
      
      expect(taskFn).toHaveBeenCalled();
    });
  });
  
  describe('manualRetryFailedTasks', () => {
    it('should retry all failed tasks', async () => {
      // Mock successful task executions
      (licenseService.checkLicenses as jest.Mock).mockResolvedValue({});
      (licenseService.retryFailedChecks as jest.Mock).mockResolvedValue(0);
      
      // Record some failed tasks
      recordFailedTask('dailyLicenseCheck', new Error('Test error 1'));
      recordFailedTask('retryFailedChecks', new Error('Test error 2'));
      
      // Run manual retry
      await manualRetryFailedTasks();
      
      // Verify tasks were retried
      expect(licenseService.checkLicenses).toHaveBeenCalled();
      expect(licenseService.retryFailedChecks).toHaveBeenCalled();
    });
    
    it('should handle no failed tasks gracefully', async () => {
      // No failed tasks recorded
      
      // Run manual retry
      await manualRetryFailedTasks();
      
      // Verify no tasks were retried
      expect(licenseService.checkLicenses).not.toHaveBeenCalled();
      expect(licenseService.retryFailedChecks).not.toHaveBeenCalled();
    });
    
    it('should continue retrying other tasks if one fails', async () => {
      // Mock one success and one failure
      (licenseService.checkLicenses as jest.Mock).mockRejectedValue(new Error('Still failing'));
      (licenseService.retryFailedChecks as jest.Mock).mockResolvedValue(0);
      
      // Record some failed tasks
      recordFailedTask('dailyLicenseCheck', new Error('Test error 1'));
      recordFailedTask('retryFailedChecks', new Error('Test error 2'));
      
      // Run manual retry
      await manualRetryFailedTasks();
      
      // Verify both tasks were attempted
      expect(licenseService.checkLicenses).toHaveBeenCalled();
      expect(licenseService.retryFailedChecks).toHaveBeenCalled();
    });
  });
  
  describe('setupCronJobs', () => {
    it('should schedule all cron jobs', () => {
      // Mock cron.schedule to return a mock scheduled task
      const mockScheduledTask = { stop: jest.fn() };
      (cron.schedule as jest.Mock).mockReturnValue(mockScheduledTask);
      
      // Setup cron jobs
      setupCronJobs();
      
      // Verify cron.schedule was called for each job
      expect(cron.schedule).toHaveBeenCalledTimes(3);
      
      // Verify jobs were stored in activeCronJobs
      expect(activeCronJobs.size).toBe(3);
      expect(activeCronJobs.has('dailyLicenseCheck')).toBe(true);
      expect(activeCronJobs.has('retryFailedChecks')).toBe(true);
      expect(activeCronJobs.has('expirationReport')).toBe(true);
    });
  });
  
  describe('stopAllCronJobs', () => {
    it('should stop all active cron jobs', () => {
      // Create mock scheduled tasks
      const mockScheduledTasks: MockScheduledTask[] = [
        { stop: jest.fn() },
        { stop: jest.fn() },
        { stop: jest.fn() }
      ];
      
      // Add mock tasks to activeCronJobs
      // Use type assertion to bypass TypeScript's type checking
      activeCronJobs.set('job1', mockScheduledTasks[0] as any);
      activeCronJobs.set('job2', mockScheduledTasks[1] as any);
      activeCronJobs.set('job3', mockScheduledTasks[2] as any);
      
      // Stop all jobs
      stopAllCronJobs();
      
      // Verify each job was stopped
      mockScheduledTasks.forEach(task => {
        expect(task.stop).toHaveBeenCalled();
      });
      
      // Verify activeCronJobs was cleared
      expect(activeCronJobs.size).toBe(0);
    });
    
    it('should handle empty activeCronJobs gracefully', () => {
      // No active jobs
      activeCronJobs.clear();
      
      // Should not throw
      expect(() => stopAllCronJobs()).not.toThrow();
    });
  });
});