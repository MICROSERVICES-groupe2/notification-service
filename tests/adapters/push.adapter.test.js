const PushAdapter = require('../../src/adapters/push.adapter');
const { messaging } = require('../../src/config/firebase');

// Mock firebase config
jest.mock('../../src/config/firebase', () => {
  const mockSend = jest.fn();
  return {
    messaging: {
      send: mockSend
    },
    isMock: false
  };
});

describe('PushAdapter Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send push notification successfully', async () => {
    messaging.send.mockResolvedValue('projects/mock/messages/123456');

    const adapter = new PushAdapter();
    const result = await adapter.send({
      to: 'mock-fcm-token',
      subject: 'Hello Title',
      body: 'Hello Body',
      data: { key: 'value' }
    });

    expect(messaging.send).toHaveBeenCalledWith({
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
    messaging.send.mockRejectedValue(firebaseError);

    const adapter = new PushAdapter();
    
    await expect(
      adapter.send({
        to: 'invalid-fcm-token',
        subject: 'Title',
        body: 'Body'
      })
    ).rejects.toThrow('The registration token is not registered');
  });
});
