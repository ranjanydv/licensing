import { License } from '../interfaces/license.interface';
import { INotificationService, EmailOptions } from '../interfaces/notification.interface';
import { Logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email';
import { emailTemplates } from '../utils/emailTemplates';

/**
 * Notification severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Notification service for sending alerts and notifications
 */
export class NotificationService implements INotificationService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger("NotificationService");
  constructor() {
    // Initialize nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });
    
    // Verify transporter connection
    this.verifyConnection();
  }
  
  /**
   * Verify email connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        this.logger.info('Email server connection established successfully');
      }
    } catch (error) {
      this.logger.error('Failed to establish email server connection:', {error});
    }
  }
  
  /**
   * Send an email
   * @param options Email options
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const { to, subject, template, data, cc, bcc, attachments } = options;
      
      // Get template content
      let html: string;
      switch (template) {
        case 'licenseExpiration':
          html = emailTemplates.licenseExpiration(data);
          break;
        case 'licenseRevocation':
          html = emailTemplates.licenseRevocation(data);
          break;
        case 'licenseExpiringSoon':
          html = emailTemplates.licenseExpiringSoon(data);
          break;
        case 'licenseTransfer':
          html = emailTemplates.licenseTransfer(data);
          break;
        case 'adminAlert':
          html = emailTemplates.adminAlert(data);
          break;
        default:
          throw new Error(`Email template '${template}' not found`);
      }
      
      // Send email
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.sendMail({
          from: emailConfig.from,
          to,
          cc,
          bcc,
          subject,
          html,
          attachments,
        });
        
        this.logger.info('Email sent successfully', { to, subject, template });
      } else {
        this.logger.info('Email would be sent in non-test environment', { to, subject, template });
      }
    } catch (error) {
      this.logger.error('Error sending email:', {error});
      throw error;
    }
  }
  
  /**
   * Send a notification about license expiration
   * @param license Expired license
   */
  async notifyLicenseExpiration(license: License): Promise<void> {
    try {
      this.logger.info('Sending license expiration notification', {
        licenseId: license._id,
        schoolId: license.schoolId,
        schoolName: license.schoolName
      });
      
      // Send email notification
      await this.sendEmail({
        to: emailConfig.adminEmail,
        subject: `License Expired: ${license.schoolName}`,
        template: 'licenseExpiration',
        data: {
          schoolName: license.schoolName,
          schoolId: license.schoolId,
          licenseId: license._id,
          expirationDate: license.expiresAt,
        },
      });
      
      this.logger.info(`License expiration notification sent for ${license.schoolName} (ID: ${license.schoolId})`);
    } catch (error) {
      this.logger.error('Error sending license expiration notification:', {error});
    }
  }
  
  /**
   * Send a notification about license revocation
   * @param license Revoked license
   */
  async notifyLicenseRevocation(license: License): Promise<void> {
    try {
      this.logger.info('Sending license revocation notification', {
        licenseId: license._id,
        schoolId: license.schoolId,
        schoolName: license.schoolName
      });
      
      // Send email notification
      await this.sendEmail({
        to: emailConfig.adminEmail,
        subject: `License Revoked: ${license.schoolName}`,
        template: 'licenseRevocation',
        data: {
          schoolName: license.schoolName,
          schoolId: license.schoolId,
          licenseId: license._id,
          revocationDate: new Date(),
          revokedBy: license.updatedBy || 'System',
        },
      });
      
      this.logger.info(`License revocation notification sent for ${license.schoolName} (ID: ${license.schoolId})`);
    } catch (error) {
      this.logger.error('Error sending license revocation notification:', {error});
    }
  }
  
  /**
   * Send a notification about license expiring soon
   * @param license License expiring soon
   * @param daysRemaining Days remaining until expiration
   */
  async notifyLicenseExpiringSoon(license: License, daysRemaining: number): Promise<void> {
    try {
      this.logger.info('Sending license expiring soon notification', {
        licenseId: license._id,
        schoolId: license.schoolId,
        schoolName: license.schoolName,
        daysRemaining
      });
      
      // Send email notification
      await this.sendEmail({
        to: emailConfig.adminEmail,
        subject: `License Expiring Soon: ${license.schoolName} (${daysRemaining} days)`,
        template: 'licenseExpiringSoon',
        data: {
          schoolName: license.schoolName,
          schoolId: license.schoolId,
          licenseId: license._id,
          expirationDate: license.expiresAt,
          daysRemaining,
        },
      });
      
      this.logger.info(`License expiring soon notification sent for ${license.schoolName} (ID: ${license.schoolId})`);
    } catch (error) {
      this.logger.error('Error sending license expiring soon notification:', {error});
    }
  }
  
  /**
   * Send an alert to administrators
   * @param message Alert message
   * @param severity Alert severity
   */
  async sendAdminAlert(message: string, severity: AlertSeverity): Promise<void> {
    try {
      this.logger.info('Sending admin alert', { message, severity });
      
      // Send email alert
      await this.sendEmail({
        to: emailConfig.adminEmail,
        subject: `Admin Alert [${severity.toUpperCase()}]: License Management System`,
        template: 'adminAlert',
        data: {
          message,
          severity,
          timestamp: new Date(),
        },
      });
      
      this.logger.info(`Admin alert sent: [${severity}] ${message}`);
    } catch (error) {
      this.logger.error('Error sending admin alert:', {error});
    }
  }
  
  /**
   * Send a notification about license transfer
   * @param license Transferred license
   * @param previousSchoolId Previous school ID
   * @param previousSchoolName Previous school name
   */
  async notifyLicenseTransfer(license: License, previousSchoolId: string, previousSchoolName: string): Promise<void> {
    try {
      this.logger.info('Sending license transfer notification', {
        licenseId: license._id,
        previousSchoolId,
        previousSchoolName,
        newSchoolId: license.schoolId,
        newSchoolName: license.schoolName
      });
      
      // Send email notification
      await this.sendEmail({
        to: emailConfig.adminEmail,
        subject: `License Transferred: ${previousSchoolName} → ${license.schoolName}`,
        template: 'licenseTransfer',
        data: {
          licenseId: license._id,
          previousSchoolName,
          previousSchoolId,
          newSchoolName: license.schoolName,
          newSchoolId: license.schoolId,
          transferDate: new Date(),
          transferredBy: license.updatedBy || 'System',
        },
      });
      
      this.logger.info(`License transfer notification sent for transfer from ${previousSchoolName} to ${license.schoolName}`);
    } catch (error) {
      this.logger.error('Error sending license transfer notification:', {error} );
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;