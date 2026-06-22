const mockEmailSend = jest.fn().mockResolvedValue({ messageId: 'email-mock-id' });
const mockSmsSend = jest.fn().mockResolvedValue({ sid: 'sms-mock-sid' });

// Mock all adapters - Mock names must start with 'mock' for Jest
jest.mock('../../src/adapters/email.adapter', () => ({
  send: mockEmailSend
}));
jest.mock('../../src/adapters/sms.adapter', () => ({
  send: mockSmsSend
}));
jest.mock('../../src/adapters/push.adapter', () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'push-mock-id' })
}));
jest.mock('../../src/adapters/inapp.adapter', () => ({
  send: jest.fn().mockResolvedValue({ id: 'inapp-mock-id' })
}));

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
      template: 'welcome',
      subject: 'Bienvenue sur notre plateforme !',
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
      template: 'loan_approved',
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
      token: 'fcm-token-rejection',
      template: 'loan_rejected',
      title: 'Décision Demande de Prêt',
      data: { name: 'Applicant', reason: 'score de crédit insuffisant' }
    };

    await notificationService.dispatch(event);

    expect(pushAdapter.send).toHaveBeenCalledWith(expect.objectContaining({
      token: 'fcm-token-rejection',
      title: 'Décision Demande de Prêt',
      body: expect.stringContaining('Votre demande de prêt a été refusée. Motif : score de crédit insuffisant.')
    }));
  });

  test('should dispatch In-App transaction confirmed notification successfully', async () => {
    const event = {
      channel: 'INAPP',
      userId: 'user_444',
      template: 'transaction_confirmed',
      title: 'Transaction Confirmée',
      data: { name: 'Investor', type: 'crédit', amount: '250', currency: 'USD', transactionId: 'TX_CR250', date: '2026-06-10' }
    };

    await notificationService.dispatch(event);

    expect(inappAdapter.send).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_444',
      title: 'Transaction Confirmée',
      body: expect.stringContaining('Votre crédit de 250 USD est confirmé.')
    }));
  });
});
