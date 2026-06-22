const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const client = require('prom-client');


const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Prometheus Metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// In-memory notification store (replace with DB in production)
const notifications = new Map();

// Structured log middleware
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || 'N/A';
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    logger: 'Express',
    message: `${req.method} ${req.url}`,
    trace_id: traceId
  }));
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// ── Notifications REST API ────────────────────────────────────────

// GET /api/notifications?userId=...
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  let result = Array.from(notifications.values());
  if (userId) {
    result = result.filter(n => n.userId === userId);
  }
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// GET /api/notifications/unread-count?userId=...
app.get('/api/notifications/unread-count', (req, res) => {
  const { userId } = req.query;
  let result = Array.from(notifications.values());
  if (userId) {
    result = result.filter(n => n.userId === userId);
  }
  const count = result.filter(n => !n.read).length;
  res.json({ count });
});

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.get(req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND', message: 'Notification introuvable' });
  }
  notification.read = true;
  notification.readAt = new Date().toISOString();
  notifications.set(req.params.id, notification);
  res.json(notification);
});

// POST /api/notifications (manual/admin creation)
app.post('/api/notifications', (req, res) => {
  const { userId, title, body, type = 'INFO', data = {} } = req.body;
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'userId, title et body sont requis' });
  }
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title,
    body,
    type,
    data,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.set(notification.id, notification);
  res.status(201).json(notification);
});

// Helper to create notifications from internal services
app.createNotification = (notification) => {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...notification,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.set(item.id, item);
  return item;
};

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    logger: 'Express',
    message: err.message,
    stack: err.stack
  }));
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

module.exports = app;
