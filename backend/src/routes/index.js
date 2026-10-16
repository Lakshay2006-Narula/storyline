/**
 * src/routes/index.js — Central route registry for News Pulse API.
 */

const { Router } = require('express');
const { getClusters, getClusterById } = require('../controllers/clusters');
const { getTimeline } = require('../controllers/timeline');
const { triggerIngest, getIngestStatus } = require('../controllers/ingest');
const { getAnalytics } = require('../controllers/analytics');

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'news-pulse-api',
    timestamp: new Date().toISOString(),
  });
});

// ── Clusters ──────────────────────────────────────────────────────────────────
router.get('/clusters', getClusters);
router.get('/clusters/:id', getClusterById);

// ── Timeline ──────────────────────────────────────────────────────────────────
router.get('/timeline', getTimeline);

// ── Analytics & Intelligence ─────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ── Ingest ────────────────────────────────────────────────────────────────────
router.post('/ingest/trigger', triggerIngest);
router.get('/ingest/status/:jobId', getIngestStatus);

module.exports = router;
