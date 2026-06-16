const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const emailAdapter = require('../adapters/email.adapter');
const smsAdapter = require('../adapters/sms.adapter');
const pushAdapter = require('../adapters/push.adapter');
const inappAdapter = require('../adapters/inapp.adapter');

class NotificationService {
  /**
   * Charge et rend un template Handlebars avec des données dynamiques
   * @param {string} templateName - Nom du fichier de template (sans extension .hbs)
   * @param {Object} data - Données dynamiques à injecter dans le template
   * @returns {string} - Le texte ou HTML final rendu
   */
  render(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template "${templateName}" not found at ${templatePath}`);
      }

      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateSource);
      return compiledTemplate(data);
    } catch (error) {
      console.error(`Error rendering template ${templateName}:`, error.message);
      throw error;
    }
  }

  /**
   * Distribue l'événement de notification vers le bon adaptateur après avoir rendu le template
   * @param {Object} event - L'événement reçu, e.g. { channel, template, data, to, subject, userId, token, title }
   */
  async dispatch(event) {
    const { channel, template, data, to, subject, userId, token, title } = event;

    if (!channel) {
      throw new Error('Notification channel is required');
    }

    // Rendre le contenu à partir du template (si fourni)
    let body = event.body || '';
    if (template) {
      body = this.render(template, data || {});
    }

    const notificationPayload = {
      to,
      subject,
      body,
      userId,
      token,
      title,
      data
    };

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'NotificationService',
      message: `Dispatching notification on channel ${channel}`
    }));

    switch (channel.toUpperCase()) {
      case 'EMAIL':
        if (!to) throw new Error('Recipient email (to) is required for EMAIL channel');
        return await emailAdapter.send({ to, subject: subject || 'Bank Alert', body });

      case 'SMS':
        if (!to) throw new Error('Phone number (to) is required for SMS channel');
        return await smsAdapter.send({ to, body });

      case 'PUSH':
        if (!token) throw new Error('FCM token is required for PUSH channel');
        return await pushAdapter.send({ token, title: title || 'Alert', body, data });

      case 'INAPP':
        if (!userId) throw new Error('userId is required for INAPP channel');
        return await inappAdapter.send({ userId, title: title || 'Alert', body, data });

      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }
}

module.exports = new NotificationService();
