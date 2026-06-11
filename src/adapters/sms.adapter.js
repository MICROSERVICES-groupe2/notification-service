const NotificationAdapter = require('./adapter.interface');
const config = require('../config');
const twilio = require('twilio');

class SMSAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.env = config.env;
    this.useTwilio = this.env === 'production' && 
                     config.twilio.accountSid && 
                     !config.twilio.accountSid.includes('placeholder') &&
                     config.twilio.authToken && 
                     !config.twilio.authToken.includes('placeholder');

    if (this.useTwilio) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'SMSAdapter',
        message: 'SMSAdapter initialized with Twilio.'
      }));
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'SMSAdapter',
        message: 'SMSAdapter initialized in mock mode.'
      }));
    }
  }

  async send(notification) {
    const { to, body } = notification;

    if (this.useTwilio) {
      try {
        const message = await this.client.messages.create({
          to,
          from: config.twilio.phone,
          body,
        });
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'SMSAdapter',
          message: `SMS sent to ${to} via Twilio`,
          sid: message.sid
        }));
        return message;
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          logger: 'SMSAdapter',
          message: `Twilio SMS failed to ${to}`,
          error: error.message
        }));
        throw error;
      }
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'SMSAdapter (Mock)',
        message: `Simulated SMS sent to ${to}`,
        body
      }));
      return { sid: `mock-sms-sid-${Date.now()}` };
    }
  }
}

module.exports = SMSAdapter;
