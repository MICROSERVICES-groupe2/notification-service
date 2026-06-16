const NotificationAdapter = require('./adapter.interface');

class InAppAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.io = null;
    // Stockage en mémoire des notifications hors-ligne
    this.offlineStore = {};
  }

  /**
   * Définit l'instance Socket.io
   * @param {Object} io - Instance de Socket.io
   */
  setSocketIO(io) {
    this.io = io;
    console.log('InAppAdapter linked to Socket.io server');
  }

  /**
   * Envoie une notification In-App
   * @param {Object} notification - Doit contenir { userId, body, title, data }
   */
  async send(notification) {
    const { userId, title, body, data } = notification;

    if (!userId) {
      throw new Error('userId is required for InApp notifications');
    }

    const payload = {
      id: notification.id || Math.random().toString(36).substr(2, 9),
      title: title || 'Nouvelle Notification',
      body: body,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'InAppAdapter',
      message: `Dispatching in-app notification to user ${userId}`
    }));

    if (!this.io) {
      console.warn('Socket.io server instance is not configured in InAppAdapter. Message queued offline.');
      this.saveOfflineNotification(userId, payload);
      return { success: true, status: 'QUEUED_NO_SERVER' };
    }

    const roomName = `user:${userId}`;
    const activeClients = this.io.sockets.adapter.rooms.get(roomName);
    const isOnline = activeClients && activeClients.size > 0;

    if (isOnline) {
      // Diffuser la notification en temps réel
      this.io.to(roomName).emit('notification', payload);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `In-app notification sent in real-time to online user ${userId}`
      }));
      return { success: true, status: 'DELIVERED' };
    } else {
      // Stocker hors-ligne pour distribution ultérieure
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `User ${userId} is offline. Notification queued.`
      }));
      this.saveOfflineNotification(userId, payload);
      return { success: true, status: 'QUEUED' };
    }
  }

  saveOfflineNotification(userId, payload) {
    if (!this.offlineStore[userId]) {
      this.offlineStore[userId] = [];
    }
    this.offlineStore[userId].push(payload);
  }

  getOfflineNotifications(userId) {
    return this.offlineStore[userId] || [];
  }

  clearOfflineNotifications(userId) {
    this.offlineStore[userId] = [];
  }
}

module.exports = new InAppAdapter();
