/**
 * src/controllers/timeline.js
 *
 * Handles:
 *   GET /timeline  — clusters formatted for the frontend timeline visualization
 *
 * Each cluster becomes a "timeline event" with:
 *   - startTime / endTime  (ISO 8601, from earliest_at / latest_at)
 *   - intensity            (normalised 0–1 based on article count)
 *   - sources              (distinct outlets in this cluster)
 */

const db = require('../db');

// ── GET /timeline ──────────────────────────────────────────────────────────────
async function getTimeline(req, res) {
  try {
    // Fetch all clusters
    const clustersResult = await db.query(`
      SELECT id, label, keywords, article_count, earliest_at, latest_at
      FROM clusters
      WHERE earliest_at IS NOT NULL AND latest_at IS NOT NULL
      ORDER BY earliest_at ASC
    `);

    if (clustersResult.rows.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // For each cluster, fetch distinct sources
    const clusterIds = clustersResult.rows.map((c) => c.id);

    const sourcesResult = await db.query(`
      SELECT
        ca.cluster_id,
        a.source_id,
        a.source_name,
        COUNT(*) as article_count
      FROM cluster_articles ca
      JOIN articles a ON a.id = ca.article_id
      WHERE ca.cluster_id = ANY($1::int[])
      GROUP BY ca.cluster_id, a.source_id, a.source_name
      ORDER BY ca.cluster_id, article_count DESC
    `, [clusterIds]);

    // Build source map: cluster_id → sources[]
    const sourceMap = {};
    for (const row of sourcesResult.rows) {
      if (!sourceMap[row.cluster_id]) sourceMap[row.cluster_id] = [];
      sourceMap[row.cluster_id].push({
        sourceId:     row.source_id,
        sourceName:   row.source_name,
        articleCount: parseInt(row.article_count, 10),
      });
    }

    // Compute max article count for intensity normalisation
    const maxCount = Math.max(...clustersResult.rows.map((c) => c.article_count), 1);

    // Build timeline events
    const timeline = clustersResult.rows.map((c) => ({
      id:           c.id,
      label:        c.label,
      keywords:     c.keywords ? c.keywords.split(',').map((k) => k.trim()) : [],
      startTime:    c.earliest_at,
      endTime:      c.latest_at,
      articleCount: c.article_count,
      intensity:    parseFloat((c.article_count / maxCount).toFixed(2)),
      sources:      sourceMap[c.id] || [],
    }));

    return res.json({
      success: true,
      count: timeline.length,
      generatedAt: new Date().toISOString(),
      data: timeline,
    });
  } catch (err) {
    console.error('[timeline] getTimeline error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch timeline' });
  }
}

module.exports = { getTimeline };
