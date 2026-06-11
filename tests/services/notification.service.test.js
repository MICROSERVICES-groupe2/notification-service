const mockEmailSend = jest.fn().mockResolvedValue({ messageId: 'email-mock-id' });
const mockSmsSend = jest.fn().mockResolvedValue({ sid: 'sms-mock-sid' });

// Mock all adapters - Mock names must start with 'mock' for Jest
jest.mock('../../src/adapters/email.adapter', () => {
  return jest.fn().mockImplementation(() => {
    return { send: mockEmailSend };
  });
});
jest.mock('../../src/adapters/sms.adapter', () => {
  return jest.fn().mockImplementation(() => {
    return { send: mockSmsSend };
  });
});
jest.mock('../../src/adapters/push.adapter', () => {
  return { send: jest.fn().mockResolvedValue({ messageId: 'push-mock-id' }) };
});
jest.mock('../../src/adapters/inapp.adapter', () => {
  return { send: jest.fn().mockResolvedValue({ id: 'inapp-mock-id' }) };
});

const notificationService = require('../../src/services/notification.service');
const pushAdapter = require('../../src/adapters/push.adapter');
const inappAdapter = require('../../src/adapters/inapp.adapter');

describe('NotificationService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should dispatch welcome email successfully', async () => {
    const event = {
      channel: 'EMAIL',
      to: 'welcome@bank.com',
      templateName: 'welcome',
      data: { name: 'Welcome User' }
    };

    await notificationService.dispatch(event);

    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'welcome@bank.com',
      subject: 'Bienvenue sur notre plateforme !',
      body: expect.stringContaining('Bienvenue Welcome User sur notre plateforme bancaire !')
    }));
  });

  test('should dispatch SMS loan notification successfully', async () => {
    const event = {
      channel: 'SMS',
      to: '+33600000000',
      templateName: 'loan_approved',
      data: { name: 'Borrower', amount: '15000', currency: 'EUR', firstPaymentDate: '2026-08-01' }
    };

    await notificationService.dispatch(event);

    expect(mockSmsSend).toHaveBeenCalledWith(expect.objectContaining({
      to: '+33600000000',
      body: expect.stringContaining('Votre demande de prêt de 15000 EUR a été approuvée.')
    }));
  });

  test('should dispatch Push loan rejection notification successfully', async () => {
    const event = {
      channel: 'PUSH',
      to: 'fcm-token-rejection',
      templateName: 'loan_rejected',
      data: { name: 'Applicant', reason: 'score de crédit insuffisant' }
    };

    await notificationService.dispatch(event);

    expect(pushAdapter.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'fcm-token-rejection',
      body: expect.stringContaining('Votre demande de prêt a été refusée. Motif : score de crédit insuffisant.')
    }));
  });

  test('should dispatch In-App transaction confirmed notification successfully', async () => {
    const event = {
      channel: 'INAPP',
      to: 'user_444',
      templateName: 'transaction_confirmed',
      data: { name: 'Investor', type: 'crédit', amount: '250', currency: 'USD', transactionId: 'TX_CR250', date: '2026-06-10' }
    };

    await notificationService.dispatch(event);

    expect(inappAdapter.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user_444',
      body: expect.stringContaining('Votre crédit de 250 USD est confirmé.')
    }));
  });
});
