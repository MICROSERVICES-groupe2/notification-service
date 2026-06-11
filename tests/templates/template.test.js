const notificationService = require('../../src/services/notification.service');

describe('Templates Rendering Tests', () => {
  test('should render welcome template correctly', () => {
    const data = { name: 'Jean Dupont' };
    const result = notificationService.render('welcome', data);
    expect(result).toContain('Bienvenue Jean Dupont sur notre plateforme bancaire !');
    expect(result).toContain('Votre compte a été créé avec succès.');
  });

  test('should render transaction_confirmed template correctly', () => {
    const data = {
      name: 'Marie Curie',
      type: 'dépôt',
      amount: '500',
      currency: 'EUR',
      transactionId: 'TX123456',
      date: '2026-06-10'
    };
    const result = notificationService.render('transaction_confirmed', data);
    expect(result).toContain('Bonjour Marie Curie,');
    expect(result).toContain('Votre dépôt de 500 EUR est confirmé.');
    expect(result).toContain('Référence : TX123456');
    expect(result).toContain('Date : 2026-06-10');
  });

  test('should render transfer_completed template correctly', () => {
    const data = {
      name: 'Albert Einstein',
      amount: '1000',
      currency: 'CHF',
      destination: 'Miletic Mileva',
      transactionId: 'TX7890'
    };
    const result = notificationService.render('transfer_completed', data);
    expect(result).toContain('Bonjour Albert Einstein,');
    expect(result).toContain('Votre transfert de 1000 CHF vers Miletic Mileva est effectué.');
    expect(result).toContain('Référence : TX7890');
  });

  test('should render loan_approved template correctly', () => {
    const data = {
      name: 'Isaac Newton',
      amount: '50000',
      currency: 'GBP',
      firstPaymentDate: '2026-07-01'
    };
    const result = notificationService.render('loan_approved', data);
    expect(result).toContain('Bonjour Isaac Newton,');
    expect(result).toContain('Votre demande de prêt de 50000 GBP a été approuvée.');
    expect(result).toContain('Première échéance le 2026-07-01.');
  });

  test('should render loan_rejected template correctly', () => {
    const data = {
      name: 'Galileo Galilei',
      reason: 'insuffisance de revenus'
    };
    const result = notificationService.render('loan_rejected', data);
    expect(result).toContain('Bonjour Galileo Galilei,');
    expect(result).toContain('Votre demande de prêt a été refusée. Motif : insuffisance de revenus.');
  });
});
