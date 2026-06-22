const NotificationAdapter = require('./adapter.interface');

class InAppAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.io = null;
    // Stockage en mémoire des notifications hors-ligne (API legacy: offlineStore)
    this.unreadStore = new Map();
    this.offlineStore = {}; // alias legacy pour les consommateurs existants
  }

  /**
   * Définit l'instance Socket.io
   * @param {Object} io - Instance de Socket.io
   */
  setSocketIO(io) {
    this.io = io;
    console.log('InAppAdapter linked to Socket.io server');
  }

  // Alias utilisé par les tests
  setIo(io) {
    this.setSocketIO(io);
  }

  /**
   * Envoie une notification In-App
   * @param {Object} notification - Doit contenir { userId, body, title, data }
   *                 ou legacy { to, body, subject, data }
   */
  async send(notification) {
    const userId = notification.userId || notification.to;
    const title = notification.title || notification.subject || 'Nouvelle Notification';
    const { body, data } = notification;

    if (!userId) {
      throw new Error('userId is required for InApp notifications');
    }

    const payload = {
      id: notification.id || Math.random().toString(36).substr(2, 9),
      title: title,
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
      return { success: true, status: 'QUEUED_NO_SERVER', ...payload };
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
      return { success: true, status: 'DELIVERED', ...payload };
    } else {
      // Stocker hors-ligne pour distribution ultérieure
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `User ${userId} is offline. Notification queued.`
      }));
      this.saveOfflineNotification(userId, payload);
      return { success: true, status: 'QUEUED', ...payload };
    }
  }

  saveOfflineNotification(userId, payload) {
    if (!this.unreadStore.has(userId)) {
      this.unreadStore.set(userId, []);
    }
    this.unreadStore.get(userId).push(payload);
    // Maintenir l'alias legacy à jour
    this.offlineStore[userId] = this.unreadStore.get(userId);
  }

  getOfflineNotifications(userId) {
    return this.unreadStore.get(userId) || [];
  }

  clearOfflineNotifications(userId) {
    this.unreadStore.set(userId, []);
    this.offlineStore[userId] = [];
  }

  flushUnread(userId) {
    const notifications = this.getOfflineNotifications(userId);
    this.unreadStore.delete(userId);
    this.offlineStore[userId] = [];
    return notifications;
  }
}

const inappAdapter = new InAppAdapter();
inappAdapter.InAppAdapter = InAppAdapter;
module.exports = inappAdapter;
