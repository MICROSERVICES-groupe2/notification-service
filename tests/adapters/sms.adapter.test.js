const SMSAdapter = require('../../src/adapters/sms.adapter');
const twilio = require('twilio');
const config = require('../../src/config');

jest.mock('twilio');

describe('SMSAdapter Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should use mock SMS by default in development', async () => {
    config.env = 'development';
    const adapter = new SMSAdapter();
    expect(adapter.useTwilio).toBe(false);

    const result = await adapter.send({ to: '+33612345678', body: 'Hello' });
    expect(result.sid).toContain('mock-sms-sid');
  });

  test('should use Twilio in production if config is set', async () => {
    config.env = 'production';
    config.twilio.accountSid = 'AC123456';
    config.twilio.authToken = 'authToken123';
    config.twilio.phone = '+1234567890';

    const mockCreate = jest.fn().mockResolvedValue({ sid: 'twilio-sid' });
    twilio.mockReturnValue({
      messages: {
        create: mockCreate
      }
    });

    const adapter = new SMSAdapter();
    expect(adapter.useTwilio).toBe(true);

    const result = await adapter.send({ to: '+33612345678', body: 'Hello Twilio' });
    expect(mockCreate).toHaveBeenCalledWith({
      to: '+33612345678',
      from: '+1234567890',
      body: 'Hello Twilio'
    });
    expect(result.sid).toBe('twilio-sid');
  });
});
