class NotificationAdapter {
  /**
   * Envoie une notification
   * @param {Object} notification - Objet contenant { to, subject, body, data }
   * @returns {Promise<any>}
   */
  async send(notification) {
    throw new Error('Method "send" must be implemented');
  }
}

module.exports = NotificationAdapter;
