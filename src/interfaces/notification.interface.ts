import { License } from './license.interface';
import { AlertSeverity } from '../services/notification.service';

/**
 * Email template data interface
 */
export interface EmailTemplateData {
  [key: string]: any;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data: EmailTemplateData;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Notification service interface
 */
export interface INotificationService {
  /**
   * Send a notification about license expiration
   * @param license Expired license
   */
  notifyLicenseExpiration(license: License): Promise<void>;
  
  /**
   * Send a notification about license revocation
   * @param license Revoked license
   */
  notifyLicenseRevocation(license: License): Promise<void>;
  
  /**
   * Send a notification about license expiring soon
   * @param license License expiring soon
   * @param daysRemaining Days remaining until expiration
   */
  notifyLicenseExpiringSoon(license: License, daysRemaining: number): Promise<void>;
  
  /**
   * Send a notification about license transfer
   * @param license Transferred license
   * @param previousSchoolId Previous school ID
   * @param previousSchoolName Previous school name
   */
  notifyLicenseTransfer(license: License, previousSchoolId: string, previousSchoolName: string): Promise<void>;
  
  /**
   * Send an alert to administrators
   * @param message Alert message
   * @param severity Alert severity
   */
  sendAdminAlert(message: string, severity: AlertSeverity): Promise<void>;
  
  /**
   * Send an email
   * @param options Email options
   */
  sendEmail(options: EmailOptions): Promise<void>;
}