import { EmailTemplateData } from '../interfaces/notification.interface';

/**
 * Email templates
 */
export const emailTemplates = {
  /**
   * License transfer template
   * @param data Template data
   * @returns HTML content
   */
  licenseTransfer: (data: EmailTemplateData): string => {
    const { 
      licenseId, 
      previousSchoolName, 
      previousSchoolId, 
      newSchoolName, 
      newSchoolId, 
      transferDate, 
      transferredBy 
    } = data;
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 10px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
            .transfer-details { background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>License Transferred</h1>
            </div>
            <div class="content">
              <p>Dear Administrator,</p>
              <p>A license has been transferred from one school to another:</p>
              
              <div class="transfer-details">
                <p><strong>From:</strong> ${previousSchoolName} (ID: ${previousSchoolId})</p>
                <p><strong>To:</strong> ${newSchoolName} (ID: ${newSchoolId})</p>
              </div>
              
              <p>Transfer Details:</p>
              <ul>
                <li>License ID: ${licenseId}</li>
                <li>Transfer Date: ${new Date(transferDate).toLocaleDateString()}</li>
                <li>Transferred By: ${transferredBy}</li>
              </ul>
              
              <p>Please verify that this transfer was authorized and contact the relevant parties if needed.</p>
              <p>
                <a href="\${process.env.ADMIN_DASHBOARD_URL}/licenses/${licenseId}" class="button">View License</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the License Management System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  /**
   * License expiration template
   * @param data Template data
   * @returns HTML content
   */
  licenseExpiration: (data: EmailTemplateData): string => {
    const { schoolName, schoolId, licenseId, expirationDate } = data;
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 10px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>License Expired</h1>
            </div>
            <div class="content">
              <p>Dear Administrator,</p>
              <p>The license for <strong>${schoolName}</strong> (ID: ${schoolId}) has expired on <strong>${new Date(expirationDate).toLocaleDateString()}</strong>.</p>
              <p>License Details:</p>
              <ul>
                <li>License ID: ${licenseId}</li>
                <li>School ID: ${schoolId}</li>
                <li>School Name: ${schoolName}</li>
                <li>Expiration Date: ${new Date(expirationDate).toLocaleDateString()}</li>
              </ul>
              <p>Please take appropriate action to renew the license or contact the school administrator.</p>
              <p>
                <a href="\${process.env.ADMIN_DASHBOARD_URL}/licenses/${licenseId}" class="button">View License</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the License Management System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  /**
   * License revocation template
   * @param data Template data
   * @returns HTML content
   */
  licenseRevocation: (data: EmailTemplateData): string => {
    const { schoolName, schoolId, licenseId, revocationDate, revokedBy } = data;
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 10px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>License Revoked</h1>
            </div>
            <div class="content">
              <p>Dear Administrator,</p>
              <p>The license for <strong>${schoolName}</strong> (ID: ${schoolId}) has been revoked on <strong>${new Date(revocationDate).toLocaleDateString()}</strong> by ${revokedBy}.</p>
              <p>License Details:</p>
              <ul>
                <li>License ID: ${licenseId}</li>
                <li>School ID: ${schoolId}</li>
                <li>School Name: ${schoolName}</li>
                <li>Revocation Date: ${new Date(revocationDate).toLocaleDateString()}</li>
                <li>Revoked By: ${revokedBy}</li>
              </ul>
              <p>Please take appropriate action or contact the school administrator if this was done in error.</p>
              <p>
                <a href="\${process.env.ADMIN_DASHBOARD_URL}/licenses/${licenseId}" class="button">View License</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the License Management System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  /**
   * License expiring soon template
   * @param data Template data
   * @returns HTML content
   */
  licenseExpiringSoon: (data: EmailTemplateData): string => {
    const { schoolName, schoolId, licenseId, expirationDate, daysRemaining } = data;
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9800; color: white; padding: 10px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>License Expiring Soon</h1>
            </div>
            <div class="content">
              <p>Dear Administrator,</p>
              <p>The license for <strong>${schoolName}</strong> (ID: ${schoolId}) will expire in <strong>${daysRemaining} days</strong> on <strong>${new Date(expirationDate).toLocaleDateString()}</strong>.</p>
              <p>License Details:</p>
              <ul>
                <li>License ID: ${licenseId}</li>
                <li>School ID: ${schoolId}</li>
                <li>School Name: ${schoolName}</li>
                <li>Expiration Date: ${new Date(expirationDate).toLocaleDateString()}</li>
                <li>Days Remaining: ${daysRemaining}</li>
              </ul>
              <p>Please take appropriate action to renew the license before it expires.</p>
              <p>
                <a href="\${process.env.ADMIN_DASHBOARD_URL}/licenses/${licenseId}" class="button">Renew License</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the License Management System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  /**
   * Admin alert template
   * @param data Template data
   * @returns HTML content
   */
  adminAlert: (data: EmailTemplateData): string => {
    const { message, severity, timestamp } = data;
    
    const severityColors: Record<string, string> = {
      low: '#4CAF50', // Green
      medium: '#ff9800', // Orange
      high: '#f44336', // Red
      critical: '#9c27b0', // Purple
    };
    
    const color = severityColors[severity as string] || '#333';
    
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${color}; color: white; padding: 10px; text-align: center; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
            .severity { font-weight: bold; color: ${color}; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Alert - <span class="severity">${severity}</span></h1>
            </div>
            <div class="content">
              <p>Dear Administrator,</p>
              <p>An alert has been triggered in the License Management System:</p>
              <p><strong>Message:</strong> ${message}</p>
              <p><strong>Severity:</strong> <span class="severity">${severity}</span></p>
              <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
              <p>Please investigate this issue as soon as possible.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the License Management System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
};

export default emailTemplates;