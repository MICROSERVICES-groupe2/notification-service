class NotificationAdapter {
  async send(notification) {
    // notification: { to, subject, body, data }
    throw new Error('Not implemented');
  }
}

module.exports = NotificationAdapter;
