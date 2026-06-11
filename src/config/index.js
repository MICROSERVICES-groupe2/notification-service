require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8087,
  env: process.env.NODE_ENV || 'development',
  kafka: {
    bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS ? process.env.KAFKA_BOOTSTRAP_SERVERS.split(',') : ['localhost:9092'],
    groupId: process.env.KAFKA_GROUP_ID || 'notifications-group',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10), // Mailhog default SMTP port is 1025
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phone: process.env.TWILIO_PHONE || '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  }
};
