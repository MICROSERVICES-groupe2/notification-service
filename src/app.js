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
