/**
 * src/controllers/clusters.js
 *
 * Handles:
 *   GET /clusters         — list all clusters (summary)
 *   GET /clusters/:id     — single cluster with all its articles
 */

const db = require('../db');

// ── GET /clusters ─────────────────────────────────────────────────────────────
async function getClusters(req, res) {
  try {
    const result = await db.query(`
      SELECT
        id,
        label,
        keywords,
        article_count,
        earliest_at,
        latest_at,
        created_at
      FROM clusters
      ORDER BY latest_at DESC NULLS LAST
    `);

    const clusters = result.rows.map((c) => ({
      id:           c.id,
      label:        c.label,
      keywords:     c.keywords ? c.keywords.split(',').map((k) => k.trim()) : [],
      articleCount: c.article_count,
      earliestAt:   c.earliest_at,
      latestAt:     c.latest_at,
      createdAt:    c.created_at,
    }));

    return res.json({
      success: true,
      count: clusters.length,
      data: clusters,
    });
  } catch (err) {
    console.error('[clusters] getClusters error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch clusters' });
  }
}

// ── GET /clusters/:id ─────────────────────────────────────────────────────────
async function getClusterById(req, res) {
  const { id } = req.params;

  // Validate id is a positive integer
  if (!id || isNaN(parseInt(id, 10)) || parseInt(id, 10) < 1) {
    return res.status(400).json({ success: false, error: 'Invalid cluster id' });
  }

  try {
    // Fetch cluster metadata
    const clusterResult = await db.query(
      `SELECT id, label, keywords, article_count, earliest_at, latest_at, created_at
       FROM clusters WHERE id = $1`,
      [parseInt(id, 10)]
    );

    if (clusterResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Cluster ${id} not found` });
    }

    const c = clusterResult.rows[0];

    // Fetch all articles belonging to this cluster, sorted chronologically
    const articlesResult = await db.query(
      `SELECT
          a.id,
          a.url,
          a.headline,
          a.summary,
          a.source_id,
          a.source_name,
          a.published_at,
          a.scrape_ok
       FROM articles a
       JOIN cluster_articles ca ON ca.article_id = a.id
       WHERE ca.cluster_id = $1
       ORDER BY a.published_at ASC NULLS LAST`,
      [parseInt(id, 10)]
    );

    return res.json({
      success: true,
      data: {
        id:           c.id,
        label:        c.label,
        keywords:     c.keywords ? c.keywords.split(',').map((k) => k.trim()) : [],
        articleCount: c.article_count,
        earliestAt:   c.earliest_at,
        latestAt:     c.latest_at,
        createdAt:    c.created_at,
        articles:     articlesResult.rows.map((a) => ({
          id:          a.id,
          url:         a.url,
          headline:    a.headline,
          summary:     a.summary,
          sourceId:    a.source_id,
          sourceName:  a.source_name,
          publishedAt: a.published_at,
          scrapeOk:    a.scrape_ok,
        })),
      },
    });
  } catch (err) {
    console.error('[clusters] getClusterById error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cluster' });
  }
}

module.exports = { getClusters, getClusterById };
