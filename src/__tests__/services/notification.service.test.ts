import { NotificationService, AlertSeverity } from '../../services/notification.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import { EmailOptions } from '../../interfaces/notification.interface';
import { emailTemplates } from '../../utils/emailTemplates';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Notification Service', () => {
  let notificationService: NotificationService;
  let mockTransporter: any;
  
  // Sample license data
  const sampleLicense = {
    _id: 'license123',
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'license-key-123',
    licenseHash: 'hash-value-123',
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false }
    ],
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date('2024-01-01'),
    lastChecked: new Date(),
    status: LicenseStatus.ACTIVE,
    metadata: { plan: 'premium' },
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock transporter
    mockTransporter = {
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };
    
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    
    // Create notification service instance
    notificationService = new NotificationService();
    
    // Set NODE_ENV to test to prevent actual email sending
    process.env.NODE_ENV = 'test';
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize nodemailer transporter', () => {
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });
    
    it('should verify connection in non-test environment', async () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Create new instance to trigger verification
      new NotificationService();
      
      // Expect verify to be called
      expect(mockTransporter.verify).toHaveBeenCalled();
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('sendEmail', () => {
    it('should send an email with the correct template', async () => {
      // Create email options
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'licenseExpiration',
        data: {
          schoolName: 'Test School',
          schoolId: 'school123',
          licenseId: 'license123',
          expirationDate: new Date(),
        },
      };
      
      // Set NODE_ENV to development to test actual sending
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Call the method
      await notificationService.sendEmail(emailOptions);
      
      // Verify sendMail was called with correct parameters
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: expect.any(String),
      }));
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
    
    it('should throw an error for invalid template', async () => {
      // Create email options with invalid template
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'invalidTemplate' as any,
        data: {},
      };
      
      // Call the method and expect it to throw
      await expect(notificationService.sendEmail(emailOptions))
        .rejects.toThrow("Email template 'invalidTemplate' not found");
    });
    
    it('should not send email in test environment', async () => {
      // Create email options
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'licenseExpiration',
        data: {
          schoolName: 'Test School',
          schoolId: 'school123',
          licenseId: 'license123',
          expirationDate: new Date(),
        },
      };
      
      // Call the method
      await notificationService.sendEmail(emailOptions);
      
      // Verify sendMail was not called
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });
  
  describe('notifyLicenseExpiration', () => {
    it('should send a notification about license expiration', async () => {
      // Spy on sendEmail
      const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail').mockResolvedValue();
      
      // Call the method
      await notificationService.notifyLicenseExpiration(sampleLicense);
      
      // Verify sendEmail was called with correct parameters
      expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
        template: 'licenseExpiration',
        subject: expect.stringContaining('License Expired'),
        data: expect.objectContaining({
          schoolName: sampleLicense.schoolName,
          schoolId: sampleLicense.schoolId,
          licenseId: sampleLicense._id,
        }),
      }));
    });
    
    it('should handle errors gracefully', async () => {
      // Make sendEmail throw an error
      jest.spyOn(notificationService, 'sendEmail').mockRejectedValue(new Error('Test error'));
      
      // Call the method and expect it not to throw
      await expect(notificationService.notifyLicenseExpiration(sampleLicense))
        .resolves.not.toThrow();
    });
  });
  
  describe('notifyLicenseRevocation', () => {
    it('should send a notification about license revocation', async () => {
      // Spy on sendEmail
      const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail').mockResolvedValue();
      
      // Call the method
      await notificationService.notifyLicenseRevocation(sampleLicense);
      
      // Verify sendEmail was called with correct parameters
      expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
        template: 'licenseRevocation',
        subject: expect.stringContaining('License Revoked'),
        data: expect.objectContaining({
          schoolName: sampleLicense.schoolName,
          schoolId: sampleLicense.schoolId,
          licenseId: sampleLicense._id,
        }),
      }));
    });
  });
  
  describe('notifyLicenseExpiringSoon', () => {
    it('should send a notification about license expiring soon', async () => {
      // Spy on sendEmail
      const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail').mockResolvedValue();
      
      // Call the method
      await notificationService.notifyLicenseExpiringSoon(sampleLicense, 15);
      
      // Verify sendEmail was called with correct parameters
      expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
        template: 'licenseExpiringSoon',
        subject: expect.stringContaining('License Expiring Soon'),
        data: expect.objectContaining({
          schoolName: sampleLicense.schoolName,
          schoolId: sampleLicense.schoolId,
          licenseId: sampleLicense._id,
          daysRemaining: 15,
        }),
      }));
    });
  });
  
  describe('sendAdminAlert', () => {
    it('should send an alert to administrators', async () => {
      // Spy on sendEmail
      const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail').mockResolvedValue();
      
      // Call the method
      await notificationService.sendAdminAlert('Test alert', AlertSeverity.HIGH);
      
      // Verify sendEmail was called with correct parameters
      expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
        template: 'adminAlert',
        subject: expect.stringContaining('Admin Alert'),
        data: expect.objectContaining({
          message: 'Test alert',
          severity: AlertSeverity.HIGH,
        }),
      }));
    });
  });
  
  describe('Email Templates', () => {
    it('should generate license expiration template', () => {
      const template = emailTemplates.licenseExpiration({
        schoolName: 'Test School',
        schoolId: 'school123',
        licenseId: 'license123',
        expirationDate: new Date(),
      });
      
      expect(template).toContain('License Expired');
      expect(template).toContain('Test School');
      expect(template).toContain('school123');
      expect(template).toContain('license123');
    });
    
    it('should generate license revocation template', () => {
      const template = emailTemplates.licenseRevocation({
        schoolName: 'Test School',
        schoolId: 'school123',
        licenseId: 'license123',
        revocationDate: new Date(),
        revokedBy: 'admin',
      });
      
      expect(template).toContain('License Revoked');
      expect(template).toContain('Test School');
      expect(template).toContain('school123');
      expect(template).toContain('license123');
      expect(template).toContain('admin');
    });
    
    it('should generate license expiring soon template', () => {
      const template = emailTemplates.licenseExpiringSoon({
        schoolName: 'Test School',
        schoolId: 'school123',
        licenseId: 'license123',
        expirationDate: new Date(),
        daysRemaining: 15,
      });
      
      expect(template).toContain('License Expiring Soon');
      expect(template).toContain('Test School');
      expect(template).toContain('school123');
      expect(template).toContain('license123');
      expect(template).toContain('15 days');
    });
    
    it('should generate admin alert template', () => {
      const template = emailTemplates.adminAlert({
        message: 'Test alert',
        severity: AlertSeverity.HIGH,
        timestamp: new Date(),
      });
      
      expect(template).toContain('Admin Alert');
      expect(template).toContain('Test alert');
      expect(template).toContain('HIGH');
    });
  });
});