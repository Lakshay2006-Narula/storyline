/**
 * src/controllers/analytics.js — News Intelligence & Python NLP Analytics Controller
 */

const db = require('../db');

async function getAnalytics(req, res) {
  try {
    // 1. Overall stats
    const articleStatsResult = await db.query(`
      SELECT 
        COUNT(*) as total_articles,
        SUM(CASE WHEN scrape_ok = TRUE THEN 1 ELSE 0 END) as enriched_articles,
        COUNT(DISTINCT source_id) as total_sources
      FROM articles
    `);
    const clusterStatsResult = await db.query(`
      SELECT 
        COUNT(*) as total_clusters,
        AVG(article_count) as avg_cluster_size,
        MAX(article_count) as max_cluster_size
      FROM clusters
    `);

    // 2. Source distribution
    const sourceBreakdownResult = await db.query(`
      SELECT 
        source_id,
        source_name,
        COUNT(*) as count
      FROM articles
      GROUP BY source_id, source_name
      ORDER BY count DESC
    `);

    // 3. Topic volume ranking with sources
    const clustersResult = await db.query(`
      SELECT id, label, keywords, article_count, earliest_at, latest_at
      FROM clusters
      ORDER BY article_count DESC
      LIMIT 12
    `);

    // 4. Cross-source coverage analysis: which clusters are reported by 2+ outlets
    const clusterSourcesResult = await db.query(`
      SELECT 
        ca.cluster_id,
        COUNT(DISTINCT a.source_id) as distinct_sources,
        ARRAY_AGG(DISTINCT a.source_name) as source_names
      FROM cluster_articles ca
      JOIN articles a ON a.id = ca.article_id
      GROUP BY ca.cluster_id
    `);

    const multiSourceClusters = clusterSourcesResult.rows.filter(r => parseInt(r.distinct_sources, 10) > 1);
    const singleSourceClusters = clusterSourcesResult.rows.filter(r => parseInt(r.distinct_sources, 10) === 1);

    // 5. Temporal distribution: articles by date
    const temporalResult = await db.query(`
      SELECT 
        SUBSTRING(published_at FROM 1 FOR 10) as publish_date,
        COUNT(*) as count
      FROM articles
      WHERE published_at IS NOT NULL
      GROUP BY publish_date
      ORDER BY publish_date ASC
    `);

    // Format output
    const totalArticles = parseInt(articleStatsResult.rows[0]?.total_articles || '0', 10);
    const enrichedArticles = parseInt(articleStatsResult.rows[0]?.enriched_articles || '0', 10);
    const totalClusters = parseInt(clusterStatsResult.rows[0]?.total_clusters || '0', 10);
    const avgClusterSize = parseFloat(parseFloat(clusterStatsResult.rows[0]?.avg_cluster_size || '0').toFixed(1));

    const sourceBreakdown = sourceBreakdownResult.rows.map(r => ({
      sourceId: r.source_id,
      sourceName: r.source_name,
      count: parseInt(r.count, 10),
      percentage: totalArticles > 0 ? Math.round((parseInt(r.count, 10) / totalArticles) * 100) : 0,
    }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalArticles,
          enrichedArticles,
          enrichmentRate: totalArticles > 0 ? Math.round((enrichedArticles / totalArticles) * 100) : 0,
          totalClusters,
          avgClusterSize,
          multiSourceStoryCount: multiSourceClusters.length,
          singleSourceStoryCount: singleSourceClusters.length,
          consensusRate: totalClusters > 0 ? Math.round((multiSourceClusters.length / totalClusters) * 100) : 0,
        },
        sourceBreakdown,
        topicRanking: clustersResult.rows.map(c => ({
          id: c.id,
          label: c.label,
          keywords: c.keywords ? c.keywords.split(',').map(k => k.trim()) : [],
          articleCount: c.article_count,
          earliestAt: c.earliest_at,
          latestAt: c.latest_at,
        })),
        temporalActivity: temporalResult.rows.map(t => ({
          date: t.publish_date,
          count: parseInt(t.count, 10),
        })),
        pythonEngine: {
          pipeline: 'Python 3.13 Scraper + TF-IDF Vectorizer',
          algorithm: 'AgglomerativeClustering (metric=cosine, linkage=average)',
          vocabularyFeatures: 5000,
          ngramRange: '1-2 (Unigrams + Bigrams)',
          centroidWeighting: 'Headline 4x, Summary 2x, Body 1x',
          deduplicationStrategy: 'SHA-256 URL Hash',
          extractionEngines: ['trafilatura (Primary)', 'BeautifulSoup4 (Fallback)'],
          dbStorage: 'PostgreSQL 18.6 on Neon (Singapore)',
        },
      },
    });
  } catch (err) {
    console.error('[analytics] getAnalytics error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to compute analytics' });
  }
}

module.exports = { getAnalytics };
