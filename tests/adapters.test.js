// Force PushAdapter to run in Console Simulation mode for these tests
process.env.FIREBASE_PROJECT_ID = '';
process.env.FIREBASE_PRIVATE_KEY = '';
process.env.FIREBASE_CLIENT_EMAIL = '';

const emailAdapter = require('../src/adapters/email.adapter');
const smsAdapter = require('../src/adapters/sms.adapter');
const pushAdapter = require('../src/adapters/push.adapter');
const inappAdapter = require('../src/adapters/inapp.adapter');

// Mocks
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-email-id-123' })
  })
}));

jest.mock('twilio', () => {
  const mockTwilio = () => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'mock-sms-sid-123' })
    }
  });
  return mockTwilio;
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue('mock-fcm-id-123')
  })
}));

describe('Adapters Unit Tests', () => {
  
  describe('EmailAdapter', () => {
    it('should send email using nodemailer in development', async () => {
      const result = await emailAdapter.send({
        to: 'test@example.com',
        subject: 'Hello',
        body: '<p>Hi</p>'
      });
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('Nodemailer');
      expect(result.messageId).toBe('mock-email-id-123');
    });
  });

  describe('SMSAdapter', () => {
    it('should simulate SMS send in development', async () => {
      const result = await smsAdapter.send({
        to: '+1234567890',
        body: 'Hello SMS'
      });
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('Console');
    });
  });

  describe('PushAdapter', () => {
    it('should simulate Push notification when credentials are not configured', async () => {
      const result = await pushAdapter.send({
        token: 'mock-token',
        title: 'Push Title',
        body: 'Push Body'
      });
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('Console');
    });

    it('should throw error if token is missing', async () => {
      await expect(pushAdapter.send({
        title: 'Title',
        body: 'Body'
      })).rejects.toThrow('FCM token is required');
    });
  });

  describe('InAppAdapter', () => {
    it('should queue notifications if user is offline', async () => {
      // Mock Socket.io io server
      const mockIo = {
        sockets: {
          adapter: {
            rooms: {
              get: jest.fn().mockReturnValue(undefined) // Room size = 0 (offline)
            }
          }
        },
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };
      
      inappAdapter.setSocketIO(mockIo);
      
      const result = await inappAdapter.send({
        userId: 'user123',
        title: 'Alert',
        body: 'Welcome back'
      });
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('QUEUED');
      
      const offline = inappAdapter.getOfflineNotifications('user123');
      expect(offline.length).toBe(1);
      expect(offline[0].body).toBe('Welcome back');
      
      // Clean up
      inappAdapter.clearOfflineNotifications('user123');
    });
  });
});
