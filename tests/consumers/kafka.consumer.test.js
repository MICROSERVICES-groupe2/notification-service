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
          template: 'welcome',
          data: { name: 'Alice' }
        }))
      }
    };

    await mockEachMessage(mockMessage);

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'EMAIL',
      to: 'test@example.com',
      template: 'welcome',
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
          clientId: 'user-777',
          clientEmail: 'user777@example.com',
          clientName: 'Bob',
          type: 'dépôt',
          amount: '150',
          currency: 'EUR'
        }))
      }
    };

    await mockEachMessage(mockMessage);

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'EMAIL',
      template: 'transaction_confirmed',
      data: expect.any(Object),
      to: 'user777@example.com',
      subject: 'Transaction Confirmée'
    });

    expect(notificationService.dispatch).toHaveBeenCalledWith({
      channel: 'INAPP',
      template: 'transaction_confirmed',
      data: expect.any(Object),
      userId: 'user-777',
      title: 'Mouvement de compte'
    });
  });

  test('should route loan events from loans.requested topic', async () => {
    await kafkaConsumer.start();

    const mockMessage = {
      topic: 'loans.requested',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify({
          clientId: 'user-888',
          clientEmail: 'user888@example.com',
          clientName: 'Charlie',
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
      template: 'loan_approved',
      data: expect.any(Object),
      to: 'user888@example.com',
      subject: 'Prêt Accordé'
    });
  });
});
