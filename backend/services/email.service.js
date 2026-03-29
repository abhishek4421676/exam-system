const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment
   */
  async initializeTransporter() {
    try {
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_SERVICE) {
        // Use Ethereal (test service) for development if no email service configured
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        logger.info('Email Service: Using Ethereal test service for development');
        this.testAccount = testAccount;
      } else if (process.env.EMAIL_SERVICE === 'gmail') {
        // Gmail configuration
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        logger.info('Email Service: Using Gmail SMTP');
      } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
        // SendGrid configuration
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
        logger.info('Email Service: Using SendGrid');
      } else {
        // Default: Gmail SMTP
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASSWORD || 'your-app-password'
          }
        });
        logger.info('Email Service: Using default Gmail configuration');
      }

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Email service initialization failed', { error: error.message });
      // Don't throw - allow app to continue without email
      this.transporter = null;
    }
  }

  /**
   * Send invitation email with magic link
   */
  async sendInvitationEmail(email, tenantName, invitationUrl, invitedBy) {
    if (!this.transporter) {
      logger.warn('Email service not initialized - email not sent', { email });
      return { success: false, message: 'Email service not available' };
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
              .warning { background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You have been invited to join <strong>${tenantName}</strong> on our Online Examination System${invitedBy ? ` by ${invitedBy}` : ''}.</p>
                <p>Click the button below to accept your invitation and create your account:</p>
                <center>
                  <a href="${invitationUrl}" class="button">Accept Invitation</a>
                </center>
                <p><strong>Link expires in 30 days.</strong></p>
                <div class="warning">
                  <strong>Security Note:</strong> If you didn't expect this invitation, you can safely ignore this email. The link above is unique to you and cannot be used by others.
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p><code>${invitationUrl}</code></p>
              </div>
              <div class="footer">
                <p>© 2026 Online Examination System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@examination.system',
        to: email,
        subject: `Invitation to join ${tenantName}`,
        html: htmlContent,
        text: `You have been invited to join ${tenantName}. Click here to accept: ${invitationUrl}`
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Invitation email sent', {
        email,
        tenant: tenantName,
        messageId: info.messageId
      });

      // If using Ethereal (test service), return preview URL
      if (this.testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info('Test email preview', { previewUrl });
        return { success: true, previewUrl, messageId: info.messageId };
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send invitation email', {
        email,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(testEmail) {
    if (!this.transporter) {
      return { success: false, message: 'Email service not available' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@examination.system',
        to: testEmail,
        subject: 'Test Email - Online Examination System',
        html: '<h1>Test Email</h1><p>This is a test email to verify the email service is working correctly.</p>',
        text: 'This is a test email to verify the email service is working correctly.'
      });

      logger.info('Test email sent', { to: testEmail, messageId: info.messageId });

      if (this.testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        return { success: true, previewUrl, messageId: info.messageId };
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send test email', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transporter status
   */
  isAvailable() {
    return this.transporter !== null;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
