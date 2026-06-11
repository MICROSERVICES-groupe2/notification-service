const NotificationAdapter = require('./adapter.interface');

class InAppAdapter extends NotificationAdapter {
  constructor() {
    super();
    this.io = null;
    // in-memory store for offline notifications: userId -> array of notifications
    this.unreadStore = new Map();
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'InAppAdapter',
      message: 'InAppAdapter initialized.'
    }));
  }

  setIo(io) {
    this.io = io;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'InAppAdapter',
      message: 'Socket.io instance set for InAppAdapter.'
    }));
  }

  async send(notification) {
    const { to: userId, subject, body, data } = notification; // 'to' represents the userId here

    if (!userId) {
      const errorMsg = 'InApp notification requires a userId (passed in "to" field)';
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        logger: 'InAppAdapter',
        message: errorMsg
      }));
      throw new Error(errorMsg);
    }

    const payload = {
      id: `inapp-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: subject || 'Notification',
      body,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    // Check if the user is online (socket room has clients)
    const roomName = `user:${userId}`;
    let isOnline = false;

    if (this.io) {
      const activeSockets = this.io.sockets.adapter.rooms.get(roomName);
      isOnline = activeSockets && activeSockets.size > 0;
    }

    if (isOnline) {
      // Emit to the user's room
      this.io.to(roomName).emit('notification', payload);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `In-App notification sent to room ${roomName}`,
        payload
      }));
    } else {
      // User is offline, buffer the notification
      if (!this.unreadStore.has(userId)) {
        this.unreadStore.set(userId, []);
      }
      this.unreadStore.get(userId).push(payload);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `User ${userId} is offline. Buffered notification. Total buffered: ${this.unreadStore.get(userId).length}`,
        payload
      }));
    }

    return payload;
  }

  // Retrieve and clear unread notifications
  flushUnread(userId) {
    if (this.unreadStore.has(userId)) {
      const unread = this.unreadStore.get(userId);
      this.unreadStore.delete(userId);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'InAppAdapter',
        message: `Flushed ${unread.length} unread notifications for user ${userId}`
      }));
      return unread;
    }
    return [];
  }
}

// Export a singleton for easy import across files
module.exports = new InAppAdapter();
