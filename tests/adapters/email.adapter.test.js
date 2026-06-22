const { EmailAdapter } = require('../../src/adapters/email.adapter');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const config = require('../../src/config');

// Mock nodemailer and sendgrid
jest.mock('nodemailer');
jest.mock('@sendgrid/mail');

describe('EmailAdapter Tests', () => {
  let mockSendMail;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up nodemailer transporter mock
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-smtp-id' });
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail
    });
  });

  test('should initialize nodemailer in development', () => {
    config.env = 'development';
    config.sendgrid.apiKey = '';
    
    const adapter = new EmailAdapter();
    expect(adapter.useSendGrid).toBe(false);
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });

  test('should use nodemailer in development even if sendgrid API key is set', () => {
    config.env = 'development';
    config.sendgrid.apiKey = 'SG.somekey';
    
    const adapter = new EmailAdapter();
    expect(adapter.useSendGrid).toBe(false);
  });

  test('should initialize SendGrid in production when API key is set', () => {
    config.env = 'production';
    config.sendgrid.apiKey = 'SG.valid_key_here';
    
    const adapter = new EmailAdapter();
    expect(adapter.useSendGrid).toBe(true);
    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.valid_key_here');
  });

  test('should send mail via SMTP in development', async () => {
    config.env = 'development';
    config.sendgrid.apiKey = '';
    const adapter = new EmailAdapter();
    
    const notification = {
      to: 'client@example.com',
      subject: 'Test SMTP',
      body: 'Hello SMTP'
    };
    
    const result = await adapter.send(notification);
    
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'no-reply@bankplatform.com',
      to: 'client@example.com',
      subject: 'Test SMTP',
      html: 'Hello SMTP'
    });
    expect(result.messageId).toBe('test-smtp-id');
  });

  test('should send mail via SendGrid in production', async () => {
    config.env = 'production';
    config.sendgrid.apiKey = 'SG.valid_key';
    
    sgMail.send.mockResolvedValue([{ headers: { 'x-message-id': 'sg-msg-id' } }]);
    
    const adapter = new EmailAdapter();
    const notification = {
      to: 'client@example.com',
      subject: 'Test SendGrid',
      body: 'Hello SendGrid'
    };
    
    const result = await adapter.send(notification);
    
    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'client@example.com',
      from: 'no-reply@bankplatform.com',
      subject: 'Test SendGrid',
      html: 'Hello SendGrid'
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('SendGrid');
  });
});
