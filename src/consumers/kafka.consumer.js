const { Kafka } = require('kafkajs');
const config = require('../config');
const notificationService = require('../services/notification.service');

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'notifications-service',
      brokers: config.kafka.bootstrapServers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
    this.isConnected = false;
  }

  async start() {
    let retries = 5;
    while (retries > 0 && !this.isConnected) {
      try {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'KafkaConsumer',
          message: `Attempting to connect to Kafka brokers: ${config.kafka.bootstrapServers.join(', ')} (Retries left: ${retries})`
        }));
        await this.consumer.connect();
        this.isConnected = true;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'KafkaConsumer',
          message: 'Kafka consumer connected successfully.'
        }));
      } catch (error) {
        retries--;
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          logger: 'KafkaConsumer',
          message: `Failed to connect to Kafka. Retrying in 5 seconds...`,
          error: error.message
        }));
        if (retries === 0) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'FATAL',
            logger: 'KafkaConsumer',
            message: 'Kafka connection failed after all retries. Continuing in mock/degraded mode.'
          }));
          return; // Do not crash the server, keep running so other protocols (socket.io, HTTP) work
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    try {
      const topics = ['notifications.send', 'transactions.created', 'loans.requested'];
      await this.consumer.subscribe({ topics, fromBeginning: false });
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'KafkaConsumer',
        message: `Subscribed to topics: ${topics.join(', ')}`
      }));

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const rawValue = message.value ? message.value.toString() : null;
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            logger: 'KafkaConsumer',
            message: `Received message from topic ${topic}`,
            partition,
            offset: message.offset
          }));

          if (!rawValue) return;

          try {
            const payload = JSON.parse(rawValue);
            await this.handleMessage(topic, payload);
          } catch (err) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'ERROR',
              logger: 'KafkaConsumer',
              message: `Error processing message from topic ${topic}`,
              error: err.message,
              rawValue
            }));
            // Do not throw to avoid crashing the consumer group
          }
        }
      });
    } catch (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        logger: 'KafkaConsumer',
        message: 'Error in consumer subscribe/run',
        error: err.message
      }));
    }
  }

  async handleMessage(topic, payload) {
    if (topic === 'notifications.send') {
      // Direct notification dispatch
      // Payload format: { channel, to, templateName, subject, data }
      await notificationService.dispatch(payload);
    } else if (topic === 'transactions.created') {
      // Map transaction event to user notifications
      // Payload might be: { userId, email, phone, fcmToken, name, type, amount, currency, transactionId, date, destination }
      const isTransfer = payload.type === 'TRANSFER' || payload.type === 'TRANSFERT' || payload.destination;
      const templateName = isTransfer ? 'transfer_completed' : 'transaction_confirmed';
      
      // Dispatch via multiple channels if available
      if (payload.email) {
        await notificationService.dispatch({
          channel: 'EMAIL',
          to: payload.email,
          templateName,
          data: payload
        });
      }
      if (payload.userId) {
        await notificationService.dispatch({
          channel: 'INAPP',
          to: payload.userId,
          templateName,
          data: payload
        });
      }
      if (payload.fcmToken) {
        await notificationService.dispatch({
          channel: 'PUSH',
          to: payload.fcmToken,
          templateName,
          data: payload
        });
      }
      if (payload.phone) {
        await notificationService.dispatch({
          channel: 'SMS',
          to: payload.phone,
          templateName,
          data: payload
        });
      }
    } else if (topic === 'loans.requested') {
      // Map loan event to user notifications
      // Payload might be: { userId, email, phone, fcmToken, name, amount, currency, status, firstPaymentDate, reason }
      const isApproved = payload.status === 'APPROVED' || payload.status === 'approved';
      const templateName = isApproved ? 'loan_approved' : 'loan_rejected';

      if (payload.email) {
        await notificationService.dispatch({
          channel: 'EMAIL',
          to: payload.email,
          templateName,
          data: payload
        });
      }
      if (payload.userId) {
        await notificationService.dispatch({
          channel: 'INAPP',
          to: payload.userId,
          templateName,
          data: payload
        });
      }
      if (payload.fcmToken) {
        await notificationService.dispatch({
          channel: 'PUSH',
          to: payload.fcmToken,
          templateName,
          data: payload
        });
      }
      if (payload.phone) {
        await notificationService.dispatch({
          channel: 'SMS',
          to: payload.phone,
          templateName,
          data: payload
        });
      }
    }
  }

  async shutdown() {
    if (this.isConnected) {
      try {
        await this.consumer.disconnect();
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'KafkaConsumer',
          message: 'Kafka consumer disconnected successfully.'
        }));
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          logger: 'KafkaConsumer',
          message: 'Error during Kafka consumer disconnect',
          error: error.message
        }));
      }
    }
  }
}

module.exports = new KafkaConsumer();
