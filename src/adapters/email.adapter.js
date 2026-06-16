const NotificationAdapter = require('./adapter.interface');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const config = require('../config');

class EmailAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.env = config.env;
    this.useSendGrid = this.env === 'production' && config.sendgrid.apiKey;

    if (this.useSendGrid) {
      sgMail.setApiKey(config.sendgrid.apiKey);
      console.log('EmailAdapter initialized using SendGrid (Production mode)');
    } else {
      // Configuration Nodemailer (Dev/Local)
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: config.smtp.user ? {
          user: config.smtp.user,
          pass: config.smtp.pass
        } : undefined
      });
      console.log(`EmailAdapter initialized using Nodemailer SMTP (${config.smtp.host}:${config.smtp.port})`);
    }
  }

  async send(notification) {
    const { to, subject, body } = notification;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'EmailAdapter',
      message: `Sending email to ${to} with subject "${subject}"`
    }));

    if (this.useSendGrid) {
      try {
        const msg = {
          to: to,
          from: process.env.EMAIL_FROM || 'no-reply@bankplatform.com',
          subject: subject,
          html: body,
        };
        await sgMail.send(msg);
        return { success: true, provider: 'SendGrid' };
      } catch (error) {
        console.error('SendGrid email send failure:', error.message);
        throw error;
      }
    } else {
      try {
        const mailOptions = {
          from: process.env.EMAIL_FROM || 'no-reply@bankplatform.com',
          to: to,
          subject: subject,
          html: body,
        };
        const info = await this.transporter.sendMail(mailOptions);
        return { success: true, provider: 'Nodemailer', messageId: info.messageId };
      } catch (error) {
        console.error('Nodemailer SMTP email send failure:', error.message);
        throw error;
      }
    }
  }
}

module.exports = new EmailAdapter();
