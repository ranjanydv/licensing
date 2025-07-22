import dotenv from 'dotenv';

dotenv.config();

/**
 * Email configuration
 */
export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
  from: process.env.EMAIL_FROM || 'noreply@licensesystem.com',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@licensesystem.com',
};

export default emailConfig;