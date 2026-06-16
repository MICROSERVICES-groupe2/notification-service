const notificationService = require('../src/services/notification.service');
const emailAdapter = require('../src/adapters/email.adapter');
const smsAdapter = require('../src/adapters/sms.adapter');

jest.mock('../src/adapters/email.adapter', () => ({
  send: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../src/adapters/sms.adapter', () => ({
  send: jest.fn().mockResolvedValue({ success: true })
}));

describe('NotificationService Unit Tests', () => {

  describe('Template Rendering', () => {
    
    it('should render transaction_confirmed template correctly', () => {
      const data = {
        name: 'Alice',
        type: 'DEPOT',
        amount: '150.00',
        currency: 'EUR',
        transactionId: 'TX-999',
        date: '2026-06-10'
      };
      
      const rendered = notificationService.render('transaction_confirmed', data);
      
      expect(rendered).toContain('Bonjour Alice');
      expect(rendered).toContain('DEPOT de 150.00 EUR est confirmé');
      expect(rendered).toContain('Référence : TX-999');
    });

    it('should render transfer_completed template correctly', () => {
      const data = {
        name: 'Bob',
        amount: '500.00',
        currency: 'XAF',
        destination: 'Charlie',
        transactionId: 'TX-111'
      };
      
      const rendered = notificationService.render('transfer_completed', data);
      
      expect(rendered).toContain('Bonjour Bob');
      expect(rendered).toContain('transfert de 500.00 XAF vers Charlie est effectué');
    });

    it('should render loan_approved template correctly', () => {
      const data = {
        name: 'David',
        amount: '10000',
        currency: 'USD',
        firstPaymentDate: '2026-07-01'
      };
      
      const rendered = notificationService.render('loan_approved', data);
      
      expect(rendered).toContain('Bonjour David');
      expect(rendered).toContain('demande de prêt de 10000 USD a été approuvée');
      expect(rendered).toContain('Première échéance le 2026-07-01');
    });

    it('should render loan_rejected template correctly', () => {
      const data = {
        name: 'Eva',
        reason: 'Revenu insuffisant'
      };
      
      const rendered = notificationService.render('loan_rejected', data);
      
      expect(rendered).toContain('Bonjour Eva');
      expect(rendered).toContain('demande de prêt a été refusée. Motif : Revenu insuffisant');
    });

    it('should render welcome template correctly', () => {
      const data = {
        name: 'Frank'
      };
      
      const rendered = notificationService.render('welcome', data);
      
      expect(rendered).toContain('Bienvenue Frank sur notre plateforme bancaire');
    });
  });

  describe('Service Dispatch', () => {
    it('should call EmailAdapter for EMAIL channel', async () => {
      await notificationService.dispatch({
        channel: 'EMAIL',
        to: 'frank@example.com',
        subject: 'Welcome',
        body: 'Hello'
      });
      
      expect(emailAdapter.send).toHaveBeenCalledWith({
        to: 'frank@example.com',
        subject: 'Welcome',
        body: 'Hello'
      });
    });

    it('should call SMSAdapter for SMS channel', async () => {
      await notificationService.dispatch({
        channel: 'SMS',
        to: '+123456',
        body: 'SMS message'
      });
      
      expect(smsAdapter.send).toHaveBeenCalledWith({
        to: '+123456',
        body: 'SMS message'
      });
    });

    it('should throw error if channel is missing', async () => {
      await expect(notificationService.dispatch({
        body: 'Hello'
      })).rejects.toThrow('Notification channel is required');
    });
  });
});
