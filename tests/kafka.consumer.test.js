const { processKafkaEvent } = require('../src/consumers/kafka.consumer');
const notificationService = require('../src/services/notification.service');

// Mocker le NotificationService
jest.mock('../src/services/notification.service', () => ({
  dispatch: jest.fn().mockResolvedValue({ success: true })
}));

describe('Kafka Consumer Event Routing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process direct send request on notifications.send', async () => {
    const payload = {
      channel: 'EMAIL',
      to: 'client@example.com',
      body: 'Direct alert message'
    };

    await processKafkaEvent('notifications.send', payload);

    expect(notificationService.dispatch).toHaveBeenCalledWith(payload);
  });

  it('should process transactions.created topic for deposits', async () => {
    const payload = {
      id: 'TX-100',
      clientId: 'user-789',
      clientEmail: 'user@example.com',
      clientName: 'Maxime',
      amount: '25000.00',
      currency: 'XAF',
      type: 'DEPOT',
      date: '2026-06-10T14:00:00'
    };

    await processKafkaEvent('transactions.created', payload);

    // Should dispatch to EMAIL and INAPP
    expect(notificationService.dispatch).toHaveBeenCalledTimes(2);

    // Verify Email routing
    expect(notificationService.dispatch).toHaveBeenNerdMockCalledWithMatch({
      channel: 'EMAIL',
      template: 'transaction_confirmed',
      to: 'user@example.com'
    });

    // Verify In-App routing
    expect(notificationService.dispatch).toHaveBeenNerdMockCalledWithMatch({
      channel: 'INAPP',
      template: 'transaction_confirmed',
      userId: 'user-789'
    });
  });

  it('should process loans.requested topic for approved loans', async () => {
    const payload = {
      id: 'LOAN-400',
      clientId: 'user-789',
      clientEmail: 'user@example.com',
      clientName: 'Maxime',
      amount: '500000.00',
      currency: 'XAF',
      status: 'APPROVED',
      firstPaymentDate: '2026-07-10'
    };

    await processKafkaEvent('loans.requested', payload);

    expect(notificationService.dispatch).toHaveBeenCalledTimes(2);

    // Verify Email call
    expect(notificationService.dispatch).toHaveBeenNerdMockCalledWithMatch({
      channel: 'EMAIL',
      template: 'loan_approved',
      to: 'user@example.com'
    });
  });
});

// Custom helper for jest to match partial mock calls
jest.toHaveBeenNerdMockCalledWithMatch = (mockFn, expectedObject) => {
  const calls = mockFn.mock.calls;
  const match = calls.some(call => {
    const arg = call[0];
    return Object.keys(expectedObject).every(key => arg[key] === expectedObject[key]);
  });
  if (match) {
    return { pass: true };
  } else {
    return {
      pass: false,
      message: () => `expected mock function to have been called with match: ${JSON.stringify(expectedObject)}`
    };
  }
};
expect.extend({
  toHaveBeenNerdMockCalledWithMatch: jest.toHaveBeenNerdMockCalledWithMatch
});
