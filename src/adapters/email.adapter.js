const NotificationAdapter = require('./adapter.interface');
const config = require('../config');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.env = config.env;
    this.useSendGrid = this.env === 'production' && config.sendgrid.apiKey && config.sendgrid.apiKey !== 'SG.your_sendgrid_api_key_placeholder';
    
    if (this.useSendGrid) {
      sgMail.setApiKey(config.sendgrid.apiKey);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'EmailAdapter',
        message: 'EmailAdapter initialized with SendGrid.'
      }));
    } else {
      // Config nodemailer for SMTP
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: false, // true for 465, false for other ports
        auth: config.smtp.user || config.smtp.pass ? {
          user: config.smtp.user,
          pass: config.smtp.pass,
        } : undefined,
      });

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'EmailAdapter',
        message: `EmailAdapter initialized with SMTP (${config.smtp.host}:${config.smtp.port}).`
      }));
    }
  }

  async send(notification) {
    const { to, subject, body, html } = notification;

    if (this.useSendGrid) {
      try {
        const msg = {
          to,
          from: 'no-reply@bankplatform.com', // Must be verified sender in SendGrid
          subject,
          text: body,
          html: html || body,
        };
        const result = await sgMail.send(msg);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'EmailAdapter',
          message: `Email sent to ${to} via SendGrid`,
          messageId: result[0]?.headers?.['x-message-id'] || 'N/A'
        }));
        return result;
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          logger: 'EmailAdapter',
          message: `SendGrid email failed to ${to}`,
          error: error.message
        }));
        throw error;
      }
    } else {
      try {
        const mailOptions = {
          from: '"Bank Platform" <no-reply@bankplatform.com>',
          to,
          subject,
          text: body,
          html: html || body,
        };
        const info = await this.transporter.sendMail(mailOptions);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'EmailAdapter',
          message: `Email sent to ${to} via SMTP`,
          messageId: info.messageId
        }));
        return info;
      } catch (error) {
        // Fallback to console logging if SMTP fails (e.g. Mailhog not running in dev)
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          logger: 'EmailAdapter',
          message: `SMTP connection failed. Logging email to console.`,
          error: error.message,
          email: { to, subject, body }
        }));
        // Return mock success object so the process can continue in dev
        return { messageId: `mock-smtp-msg-${Date.now()}` };
      }
    }
  }
}

module.exports = EmailAdapter;
