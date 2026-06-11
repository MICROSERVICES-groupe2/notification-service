const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const emailAdapter = new (require('../adapters/email.adapter'))();
const smsAdapter = new (require('../adapters/sms.adapter'))();
const pushAdapter = require('../adapters/push.adapter');
const inappAdapter = require('../adapters/inapp.adapter');

class NotificationService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.compiledTemplates = new Map();
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'NotificationService',
      message: 'NotificationService initialized.'
    }));
  }

  // Compile and cache handlebars template
  getTemplate(templateName) {
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName);
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiled = handlebars.compile(source);
    this.compiledTemplates.set(templateName, compiled);
    return compiled;
  }

  render(templateName, data) {
    try {
      const template = this.getTemplate(templateName);
      return template(data);
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        logger: 'NotificationService',
        message: `Failed to render template ${templateName}`,
        error: error.message
      }));
      throw error;
    }
  }

  // Main entry point for dispatching notifications
  async dispatch(event) {
    // Event format:
    // {
    //   channel: 'EMAIL' | 'SMS' | 'PUSH' | 'INAPP',
    //   to: string (email, phone, fcmToken, or userId),
    //   templateName: string,
    //   subject?: string,
    //   data: object
    // }
    const { channel, to, templateName, subject, data } = event;

    if (!channel || !to || !templateName) {
      throw new Error('Notification event requires channel, to, and templateName fields.');
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'NotificationService',
      message: `Dispatching notification to ${to} via ${channel} using template ${templateName}`
    }));

    const body = this.render(templateName, data);

    const notificationPayload = {
      to,
      subject: subject || this.getDefaultSubject(templateName),
      body,
      html: body, // For emails, passes the body as HTML
      data
    };

    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return await emailAdapter.send(notificationPayload);
      case 'SMS':
        return await smsAdapter.send(notificationPayload);
      case 'PUSH':
        return await pushAdapter.send(notificationPayload);
      case 'INAPP':
        return await inappAdapter.send(notificationPayload);
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  getDefaultSubject(templateName) {
    switch (templateName) {
      case 'welcome':
        return 'Bienvenue sur notre plateforme !';
      case 'transaction_confirmed':
        return 'Confirmation de transaction';
      case 'transfer_completed':
        return 'Transfert effectué';
      case 'loan_approved':
        return 'Votre demande de prêt est approuvée !';
      case 'loan_rejected':
        return 'Mise à jour concernant votre demande de prêt';
      default:
        return 'Nouvelle Notification';
    }
  }
}

module.exports = new NotificationService();
