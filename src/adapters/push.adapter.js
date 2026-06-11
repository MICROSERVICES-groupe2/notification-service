const NotificationAdapter = require('./adapter.interface');
const { messaging, isMock } = require('../config/firebase');

class PushAdapter extends NotificationAdapter {
  constructor() {
    super();
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'PushAdapter',
      message: `PushAdapter initialized (Mock mode: ${isMock}).`
    }));
  }

  async send(notification) {
    const { to, subject, body, data } = notification; // 'to' represents the FCM Registration Token here

    try {
      const payload = {
        token: to,
        notification: {
          title: subject || 'New Notification',
          body: body,
        },
        data: data || {},
      };

      const messageId = await messaging.send(payload);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'PushAdapter',
        message: `Push notification sent successfully to token ${to.substring(0, 15)}...`,
        messageId
      }));
      return { messageId };
    } catch (error) {
      // Catch specific Firebase Admin Messaging error codes for invalid registration tokens
      const isInvalidToken = error.code === 'messaging/registration-token-not-registered' || 
                             error.code === 'messaging/invalid-registration-token' ||
                             error.message?.includes('not registered') ||
                             error.message?.includes('invalid token');

      if (isInvalidToken) {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          logger: 'PushAdapter',
          message: `FCM token is invalid or no longer registered: ${to}. Simulating deleting from DB.`,
          error: error.message
        }));
      } else {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          logger: 'PushAdapter',
          message: `Push notification failed to send`,
          error: error.message
        }));
      }
      throw error;
    }
  }
}

module.exports = PushAdapter;
