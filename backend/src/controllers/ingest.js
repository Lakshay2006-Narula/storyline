/**
 * src/controllers/ingest.js
 *
 * Handles:
 *   POST /ingest/trigger       — spawn Python pipeline, return jobId
 *   GET  /ingest/status/:jobId — poll job status
 *
 * Jobs are tracked in-memory (Map). In production you'd use Redis,
 * but for this assessment in-memory is sufficient and simple to demo.
 */

const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// In-memory job store: jobId → { status, startedAt, completedAt, output, error }
const jobs = new Map();

// Clean up jobs older than 1 hour to avoid memory leak
setInterval(() => {
  const oneHourAgo = Date.now() - 3600 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (new Date(job.startedAt).getTime() < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000); // check every 10 minutes


// ── POST /ingest/trigger ───────────────────────────────────────────────────────
async function triggerIngest(req, res) {
  // Prevent multiple simultaneous runs
  const running = [...jobs.values()].find((j) => j.status === 'running');
  if (running) {
    return res.status(409).json({
      success: false,
      error: 'A pipeline run is already in progress',
      jobId: running.jobId,
    });
  }

  const jobId = uuidv4();
  const startedAt = new Date().toISOString();

  // Resolve paths — __dirname is src/controllers, so go up 2 levels to backend root
  const pythonCmd = process.env.PYTHON_CMD || 'python';
  const backendRoot = path.resolve(__dirname, '..', '..');
  const scraperRelative = process.env.SCRAPER_PATH || path.join('..', 'scraper', 'pipeline.py');
  const scraperPath = path.resolve(backendRoot, scraperRelative);
  const scraperDir = path.dirname(scraperPath);

  // Register job as running immediately
  jobs.set(jobId, {
    jobId,
    status: 'running',
    startedAt,
    completedAt: null,
    output: null,
    error: null,
    summary: null,
  });

  console.log(`[ingest] Starting pipeline job ${jobId}`);
  console.log(`[ingest] Command: ${pythonCmd} ${scraperPath}`);

  // Spawn Python pipeline — non-blocking, runs in background
  const child = spawn(pythonCmd, [scraperPath], {
    cwd: scraperDir,
    env: { ...process.env },   // pass env vars (DATABASE_URL etc.) to child
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => { stdout += data.toString(); });
  child.stderr.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    const job = jobs.get(jobId);
    if (!job) return;

    const completedAt = new Date().toISOString();

    if (code === 0) {
      // Parse the JSON summary printed to stdout by pipeline.py
      let summary = null;
      try {
        summary = JSON.parse(stdout.trim());
      } catch {
        summary = { raw: stdout.trim() };
      }
      jobs.set(jobId, {
        ...job,
        status: 'completed',
        completedAt,
        summary,
        output: stderr.slice(-2000), // last 2000 chars of log
        error: null,
      });
      console.log(`[ingest] Job ${jobId} completed — clusters: ${summary?.clusters_created}`);
    } else {
      jobs.set(jobId, {
        ...job,
        status: 'failed',
        completedAt,
        summary: null,
        output: stderr.slice(-2000),
        error: `Pipeline exited with code ${code}`,
      });
      console.error(`[ingest] Job ${jobId} FAILED (exit ${code})`);
    }
  });

  child.on('error', (err) => {
    const job = jobs.get(jobId);
    jobs.set(jobId, {
      ...job,
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: `Failed to spawn pipeline: ${err.message}`,
    });
    console.error(`[ingest] Spawn error for job ${jobId}:`, err.message);
  });

  // Respond immediately — frontend polls /ingest/status/:jobId
  return res.status(202).json({
    success: true,
    jobId,
    status: 'running',
    startedAt,
    message: 'Pipeline started. Poll /ingest/status/:jobId for updates.',
  });
}


// ── GET /ingest/status/:jobId ──────────────────────────────────────────────────
async function getIngestStatus(req, res) {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ success: false, error: 'jobId is required' });
  }

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: `Job ${jobId} not found. It may have expired or never existed.`,
    });
  }

  return res.json({
    success: true,
    data: {
      jobId:       job.jobId,
      status:      job.status,          // 'running' | 'completed' | 'failed'
      startedAt:   job.startedAt,
      completedAt: job.completedAt,
      summary:     job.summary,         // pipeline JSON output (when completed)
      error:       job.error,           // error message (when failed)
    },
  });
}

module.exports = { triggerIngest, getIngestStatus };
