const { Kafka } = require('kafkajs');
const config = require('../config');
const notificationService = require('../services/notification.service');

const kafka = new Kafka({
  clientId: 'notifications-service',
  brokers: config.kafka.bootstrapServers,
  connectionTimeout: 5000,
  initialRetryTime: 100,
  retries: 3
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });

let isConnected = false;

/**
 * Traite les événements de transaction pour les mapper aux templates Handlebars
 */
async function handleTransactionEvent(payload) {
  // payload: { id, clientId, clientEmail, clientName, amount, currency, type, destination, status, date }
  const isTransfer = payload.type && payload.type.toUpperCase() === 'TRANSFERT';
  const template = isTransfer ? 'transfer_completed' : 'transaction_confirmed';
  
  const templateData = {
    name: payload.clientName || 'Cher Client',
    amount: payload.amount || '0.00',
    currency: payload.currency || 'XAF',
    type: payload.type || 'transaction',
    destination: payload.destination || 'destinataire',
    transactionId: payload.id || 'N/A',
    date: payload.date || new Date().toLocaleString()
  };

  // Envoi par e-mail
  if (payload.clientEmail) {
    try {
      await notificationService.dispatch({
        channel: 'EMAIL',
        template: template,
        data: templateData,
        to: payload.clientEmail,
        subject: isTransfer ? 'Transfert Effectué' : 'Transaction Confirmée'
      });
    } catch (e) {
      console.error('Failed to send transaction email notification:', e.message);
    }
  }

  // Envoi In-App (temps réel)
  if (payload.clientId) {
    try {
      await notificationService.dispatch({
        channel: 'INAPP',
        template: template,
        data: templateData,
        userId: payload.clientId,
        title: isTransfer ? 'Virement émis' : 'Mouvement de compte'
      });
    } catch (e) {
      console.error('Failed to send transaction in-app notification:', e.message);
    }
  }
}

/**
 * Traite les événements de prêts (loans)
 */
async function handleLoanEvent(payload) {
  // payload: { id, clientId, clientEmail, clientName, amount, currency, status, reason, firstPaymentDate }
  const isApproved = payload.status && payload.status.toUpperCase() === 'APPROVED';
  const template = isApproved ? 'loan_approved' : 'loan_rejected';

  const templateData = {
    name: payload.clientName || 'Cher Client',
    amount: payload.amount || '0.00',
    currency: payload.currency || 'XAF',
    reason: payload.reason || 'Critères d\'attribution non respectés',
    firstPaymentDate: payload.firstPaymentDate || 'N/A'
  };

  // Envoi par email
  if (payload.clientEmail) {
    try {
      await notificationService.dispatch({
        channel: 'EMAIL',
        template: template,
        data: templateData,
        to: payload.clientEmail,
        subject: isApproved ? 'Prêt Accordé' : 'Décision Demande de Prêt'
      });
    } catch (e) {
      console.error('Failed to send loan email notification:', e.message);
    }
  }

  // Envoi In-App
  if (payload.clientId) {
    try {
      await notificationService.dispatch({
        channel: 'INAPP',
        template: template,
        data: templateData,
        userId: payload.clientId,
        title: isApproved ? 'Félicitations - Prêt approuvé' : 'Demande de prêt refusée'
      });
    } catch (e) {
      console.error('Failed to send loan in-app notification:', e.message);
    }
  }
}

/**
 * Routeur principal des événements Kafka
 */
async function processKafkaEvent(topic, payload) {
  switch (topic) {
    case 'notifications.send':
      // Direct notification request
      await notificationService.dispatch(payload);
      break;
      
    case 'transactions.created':
      await handleTransactionEvent(payload);
      break;
      
    case 'loans.requested':
      await handleLoanEvent(payload);
      break;
      
    default:
      console.warn(`No handler for topic: ${topic}`);
  }
}

/**
 * Démarre le consommateur Kafka avec retry backoff
 */
async function startKafkaConsumer() {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'KafkaConsumer',
    message: 'Attempting to connect to Kafka brokers...'
  }));

  try {
    await consumer.connect();
    isConnected = true;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      logger: 'KafkaConsumer',
      message: 'Connected to Kafka successfully'
    }));

    // S'inscrire aux différents topics
    await consumer.subscribe({ topic: 'notifications.send', fromBeginning: false });
    await consumer.subscribe({ topic: 'transactions.created', fromBeginning: false });
    await consumer.subscribe({ topic: 'loans.requested', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const msgValue = message.value.toString();
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          logger: 'KafkaConsumer',
          message: `Received message from topic "${topic}"`,
          payload: msgValue
        }));

        try {
          const payload = JSON.parse(msgValue);
          await processKafkaEvent(topic, payload);
        } catch (err) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            logger: 'KafkaConsumer',
            message: `Error parsing event on topic ${topic}: ${err.message}`
          }));
        }
      }
    });

  } catch (error) {
    isConnected = false;
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      logger: 'KafkaConsumer',
      message: `Could not connect to Kafka (${error.message}). Retrying in 10s...`
    }));
    
    // Retry connection without crashing the express server
    setTimeout(startKafkaConsumer, 10000);
  }
}

module.exports = {
  start: startKafkaConsumer,
  startKafkaConsumer,
  consumer,
  processKafkaEvent,
  get isConnected() { return isConnected; }
};
