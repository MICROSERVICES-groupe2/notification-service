const NotificationAdapter = require('./adapter.interface');
const admin = require('firebase-admin');
const config = require('../config');

class PushAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.initialized = false;

    const hasCredentials = config.firebase.projectId && config.firebase.privateKey && config.firebase.clientEmail;

    if (hasCredentials) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey,
            clientEmail: config.firebase.clientEmail,
          })
        });
        this.initialized = true;
        console.log('PushAdapter initialized using Firebase Admin SDK');
      } catch (error) {
        console.error('Firebase Admin SDK initialization failure:', error.message);
        console.log('Falling back to Console Simulation mode for Push notifications');
      }
    } else {
      console.log('Firebase credentials missing. PushAdapter initialized in Console Simulation mode');
    }
  }

  async send(notification) {
    const { token, title, body, data } = notification;

    // Check if we have token
    if (!token) {
      throw new Error('FCM token is required to send push notification');
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'PushAdapter',
      message: `Sending Push Notification to token ${token.substring(0, 10)}...: "${title} - ${body}"`
    }));

    if (this.initialized) {
      try {
        const payload = {
          token: token,
          notification: {
            title: title,
            body: body
          },
          data: data || {}
        };
        const response = await admin.messaging().send(payload);
        return { success: true, provider: 'Firebase', messageId: response };
      } catch (error) {
        console.error('Firebase FCM send failure:', error.message);
        
        // Gérer les tokens FCM invalides
        if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/registration-token-not-registered') {
          console.warn(`FCM Token is invalid/unregistered. Token should be removed from database.`);
          return { success: false, code: 'TOKEN_INVALID', message: error.message };
        }
        throw error;
      }
    } else {
      // Simulate Push notification dispatch
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'PushAdapter-Simulator',
        message: `[SIMULATION] Push notification sent to token successfully.`
      }));
      return { success: true, provider: 'Console' };
    }
  }
}

module.exports = new PushAdapter();
