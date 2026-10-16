/**
 * src/server.js — News Pulse Express API server.
 *
 * Endpoints:
 *   GET  /health              — health check
 *   GET  /clusters            — all topic clusters (summary)
 *   GET  /clusters/:id        — single cluster with articles
 *   GET  /timeline            — clusters formatted for timeline UI
 *   POST /ingest/trigger      — kick off Python scraper pipeline
 *   GET  /ingest/status/:id   — poll pipeline job status
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS — allow frontend origin (Vercel URL in prod, localhost in dev)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Request logging (minimal)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// Redirect bare root to /api/health for easy browser check
app.get('/', (req, res) => res.redirect('/api/health'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET  /api/health',
      'GET  /api/clusters',
      'GET  /api/clusters/:id',
      'GET  /api/timeline',
      'POST /api/ingest/trigger',
      'GET  /api/ingest/status/:jobId',
    ],
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log(`│  News Pulse API running on port ${PORT}         │`);
  console.log('│                                             │');
  console.log('│  GET  /api/health                           │');
  console.log('│  GET  /api/clusters                         │');
  console.log('│  GET  /api/clusters/:id                     │');
  console.log('│  GET  /api/timeline                         │');
  console.log('│  POST /api/ingest/trigger                   │');
  console.log('│  GET  /api/ingest/status/:jobId             │');
  console.log('└─────────────────────────────────────────────┘');
  console.log('');
});

module.exports = app;
