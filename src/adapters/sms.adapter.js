const NotificationAdapter = require('./adapter.interface');
const twilio = require('twilio');
const config = require('../config');

class SMSAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.env = config.env;
    this.useTwilio = this.env === 'production' && config.twilio.accountSid && config.twilio.authToken;

    if (this.useTwilio) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      console.log('SMSAdapter initialized using Twilio (Production mode)');
    } else {
      console.log('SMSAdapter initialized in Console Simulation mode (Development)');
    }
  }

  async send(notification) {
    const { to, body } = notification;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'SMSAdapter',
      message: `Sending SMS to ${to}: "${body}"`
    }));

    if (this.useTwilio) {
      try {
        const message = await this.client.messages.create({
          body: body,
          to: to,
          from: config.twilio.phone // Twilio Sender Phone Number
        });
        return { success: true, provider: 'Twilio', sid: message.sid };
      } catch (error) {
        console.error('Twilio SMS send failure:', error.message);
        throw error;
      }
    } else {
      // Simulate SMS dispatch
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'SMSAdapter-Simulator',
        message: `[SIMULATION] SMS sent to ${to} successfully.`
      }));
      return { success: true, provider: 'Console' };
    }
  }
}

module.exports = new SMSAdapter();
