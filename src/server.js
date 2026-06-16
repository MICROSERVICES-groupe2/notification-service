const http = require('http');
const app = require('./app');
const config = require('./config');

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Partage de l'instance io avec l'adaptateur in-app
const inappAdapter = require('./adapters/inapp.adapter');
inappAdapter.setSocketIO(io);

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    const roomName = `user:${userId}`;
    socket.join(roomName);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'Socket.io',
      message: `User ${userId} joined room ${roomName}`
    }));

    // Récupérer et envoyer les notifications non lues hors-ligne
    const offlineNotifications = inappAdapter.getOfflineNotifications(userId);
    if (offlineNotifications.length > 0) {
      socket.emit('offline-notifications', offlineNotifications);
      inappAdapter.clearOfflineNotifications(userId);
    }
  }

  socket.on('disconnect', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'Socket.io',
      message: `Client disconnected: ${socket.id}`
    }));
  });
});

const PORT = config.port;
server.listen(PORT, async () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'Server',
    message: `Server bank-platform-notifications running on port ${PORT}`
  }));

  // Initialisation du consumer Kafka
  const { startKafkaConsumer } = require('./consumers/kafka.consumer');
  try {
    await startKafkaConsumer();
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      logger: 'KafkaInit',
      message: `Failed to start Kafka consumer: ${error.message}`
    }));
  }
});

module.exports = server;
