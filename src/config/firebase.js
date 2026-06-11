const admin = require('firebase-admin');
const config = require('./index');

let messagingMock = null;
let firebaseInitialized = false;

// Check if credentials are valid (not empty and not the placeholder string)
const isConfigValid = 
  config.firebase.projectId && 
  config.firebase.projectId !== 'your_firebase_project_id' &&
  config.firebase.privateKey && 
  !config.firebase.privateKey.includes('your_private_key_placeholder') &&
  config.firebase.clientEmail && 
  config.firebase.clientEmail !== 'your_firebase_client_email';

if (isConfigValid) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });
    firebaseInitialized = true;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'FirebaseConfig',
      message: 'Firebase Admin SDK initialized successfully.'
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      logger: 'FirebaseConfig',
      message: 'Failed to initialize Firebase Admin SDK. Falling back to mock.',
      error: error.message
    }));
  }
} else {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'WARN',
    logger: 'FirebaseConfig',
    message: 'Firebase credentials missing or using placeholders. Push notifications will run in mock/console log mode.'
  }));
}

if (!firebaseInitialized) {
  // Mock messaging client
  messagingMock = {
    send: async (message) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'PushAdapter (Mock)',
        message: 'Simulated sending FCM push notification',
        payload: message
      }));
      // Simulate successful send with a mock message ID
      return `projects/${config.firebase.projectId || 'mock-project'}/messages/mock-msg-id-${Date.now()}`;
    }
  };
}

module.exports = {
  admin,
  messaging: firebaseInitialized ? admin.messaging() : messagingMock,
  isMock: !firebaseInitialized
};
