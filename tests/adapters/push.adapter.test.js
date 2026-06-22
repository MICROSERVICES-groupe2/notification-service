process.env.FIREBASE_PROJECT_ID = 'mock-project';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----';
process.env.FIREBASE_CLIENT_EMAIL = 'mock@mock-project.iam.gserviceaccount.com';

let mockMessagingSend;

jest.mock('firebase-admin', () => {
  mockMessagingSend = jest.fn();
  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn().mockReturnValue({ type: 'service_account' })
    },
    messaging: jest.fn().mockReturnValue({
      send: mockMessagingSend
    })
  };
});

const { PushAdapter } = require('../../src/adapters/push.adapter');

describe('PushAdapter Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send push notification successfully', async () => {
    mockMessagingSend.mockResolvedValue('projects/mock/messages/123456');

    const adapter = new PushAdapter();
    const result = await adapter.send({
      token: 'mock-fcm-token',
      title: 'Hello Title',
      body: 'Hello Body',
      data: { key: 'value' }
    });

    expect(mockMessagingSend).toHaveBeenCalledWith({
      token: 'mock-fcm-token',
      notification: {
        title: 'Hello Title',
        body: 'Hello Body'
      },
      data: { key: 'value' }
    });
    expect(result.messageId).toBe('projects/mock/messages/123456');
  });

  test('should log warning and handle invalid/unregistered FCM tokens gracefully', async () => {
    const firebaseError = new Error('The registration token is not registered');
    firebaseError.code = 'messaging/registration-token-not-registered';
    mockMessagingSend.mockRejectedValue(firebaseError);

    const adapter = new PushAdapter();
    
    const result = await adapter.send({
      token: 'invalid-fcm-token',
      title: 'Title',
      body: 'Body'
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('TOKEN_INVALID');
  });
});
