const kafkaConsumer = require('../../src/consumers/kafka.consumer');
const notificationService = require('../../src/services/notification.service');

// Mock kafkajs
jest.mock('kafkajs', () => {
  const mockConnect = jest.fn().mockResolvedValue();
  const mockSubscribe = jest.fn().mockResolvedValue();
  const mockRun = jest.fn().mockImplementation(async (config) => {
    // Save eachMessage handler to call it manually in tests
    mockEachMessage = config.eachMessage;
  });
  const mockDisconnect = jest.fn().mockResolvedValue();

  return {
    Kafka: jest.fn().mockImplementation(() => {
      return {
        consumer: jest.fn().mockReturnValue({
          connect: mockConnect,
          subscribe: mockSubscribe,
          run: mockRun,
          disconnect: mockDisconnect
        })
      };
    })
  };
});

// Mock notification service
jest.mock('../../src/services/notification.service', () => {
  return {
    dispatch: jest.fn().mockResolvedValue()
  };
});

let mockEachMessage;

describe('KafkaConsumer Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should connect and subscribe to topics', async () => {
    await kafkaConsumer.start();
    expect(kafkaConsumer.isConnected).toBe(true);
  });

  test('should route direct notifications from notifications.send topic', async () => {
    await kafkaConsumer.start();
    
    const mockMessage = {
      topic: 'notifications.send',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify({
          channel: 'EMAIL',
          to: 'test@example.com',
          templateName: 'welcome',
          data: { name: 'Alice' }
        }))
      }
    };

    await mockEachMessage(mockMessage);

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'EMAIL',
      to: 'test@example.com',
      templateName: 'welcome',
      data: { name: 'Alice' }
    });
  });

  test('should route transaction events from transactions.created topic', async () => {
    await kafkaConsumer.start();

    const mockMessage = {
      topic: 'transactions.created',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify({
          userId: 'user-777',
          email: 'user777@example.com',
          name: 'Bob',
          type: 'dépôt',
          amount: '150',
          currency: 'EUR'
        }))
      }
    };

    await mockEachMessage(mockMessage);

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'EMAIL',
      to: 'user777@example.com',
      templateName: 'transaction_confirmed',
      data: expect.any(Object)
    });

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'INAPP',
      to: 'user-777',
      templateName: 'transaction_confirmed',
      data: expect.any(Object)
    });
  });

  test('should route loan events from loans.requested topic', async () => {
    await kafkaConsumer.start();

    const mockMessage = {
      topic: 'loans.requested',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify({
          userId: 'user-888',
          email: 'user888@example.com',
          name: 'Charlie',
          amount: '10000',
          currency: 'EUR',
          status: 'APPROVED',
          firstPaymentDate: '2026-09-01'
        }))
      }
    };

    await mockEachMessage(mockMessage);

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'EMAIL',
      to: 'user888@example.com',
      templateName: 'loan_approved',
      data: expect.any(Object)
    });
  });
});
