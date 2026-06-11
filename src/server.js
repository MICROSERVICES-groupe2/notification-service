const http = require('http');
const app = require('./app');
const config = require('./config');
const socketIo = require('socket.io');
const inappAdapter = require('./adapters/inapp.adapter');
const kafkaConsumer = require('./consumers/kafka.consumer');

const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Link io instance to InAppAdapter
inappAdapter.setIo(io);

// Handle Socket.io connections
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId || socket.handshake.auth?.userId;

  if (userId) {
    const roomName = `user:${userId}`;
    socket.join(roomName);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'SocketServer',
      message: `User ${userId} connected. Joined room ${roomName}. Socket ID: ${socket.id}`
    }));

    // Retrieve and deliver unread notifications buffered while user was offline
    const unreadNotifications = inappAdapter.flushUnread(userId);
    if (unreadNotifications.length > 0) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'SocketServer',
        message: `Delivering ${unreadNotifications.length} offline notifications to user ${userId}`
      }));
      unreadNotifications.forEach((notification) => {
        socket.emit('notification', notification);
      });
    }
  } else {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      logger: 'SocketServer',
      message: `Client connected without userId. Socket ID: ${socket.id}`
    }));
  }

  socket.on('disconnect', (reason) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'SocketServer',
      message: `Socket disconnected. ID: ${socket.id}, Reason: ${reason}`
    }));
  });
});

// Start the server
server.listen(config.port, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'ExpressServer',
    message: `Server is running on port ${config.port} in ${config.env} mode.`
  }));

  // Start the Kafka consumer in the background
  kafkaConsumer.start();
});

// Graceful shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'Lifecycle',
    message: `Received ${signal}. Starting graceful shutdown...`
  }));

  // Close HTTP server first (stops accepting new requests)
  server.close(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'Lifecycle',
      message: 'HTTP server closed.'
    }));
  });

  // Shut down Kafka consumer
  await kafkaConsumer.shutdown();

  // Close Socket.io connections
  io.close(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'Lifecycle',
      message: 'Socket.io server closed.'
    }));
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'Lifecycle',
    message: 'Graceful shutdown complete. Exiting process.'
  }));
  process.exit(0);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = server;
