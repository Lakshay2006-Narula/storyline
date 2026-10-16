"""
pipeline.py — Main entry point for the News Pulse ingestion pipeline.

Run this file directly:
    python pipeline.py

Or trigger it from the Node.js backend via child_process.spawn().

Steps:
  1. Init DB (create tables if missing)
  2. Fetch all RSS feeds
  3. Save raw articles to DB (deduplication by URL hash)
  4. Enrich articles with full body text
  5. Cluster articles by topic using TF-IDF
  6. Save clusters to DB
  7. Print summary JSON for the Node.js backend to parse
"""

import json
import logging
import sys
import time
from datetime import datetime, timezone

from config import LOG_LEVEL, RSS_FEEDS
from db import init_db, save_articles, get_recent_articles, get_articles_by_ids, save_clusters, update_article_bodies
from rss_parser import fetch_all_feeds
from article_extractor import enrich_articles
from clusterer import cluster_articles

# ─── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stderr)],  # logs to stderr; stdout is for JSON
)
log = logging.getLogger("pipeline")


# ─── Pipeline ──────────────────────────────────────────────────────────────────

def run_pipeline() -> dict:
    """
    Execute the full ingestion and clustering pipeline.
    Returns a summary dict that is printed as JSON to stdout.
    """
    start_time = time.time()
    log.info("=" * 60)
    log.info("News Pulse Pipeline Starting")
    log.info("=" * 60)

    summary = {
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "feeds_fetched": 0,
        "articles_fetched": 0,
        "articles_new": 0,
        "articles_enriched": 0,
        "clusters_created": 0,
        "elapsed_seconds": 0,
        "error": None,
    }

    try:
        # ── Step 1: Initialize DB ────────────────────────────────────────────
        log.info("Step 1/5: Initializing database...")
        init_db()

        # ── Step 2: Fetch RSS Feeds ──────────────────────────────────────────
        log.info("Step 2/5: Fetching RSS feeds...")
        raw_articles = fetch_all_feeds()
        summary["feeds_fetched"] = len(RSS_FEEDS)
        summary["articles_fetched"] = len(raw_articles)

        if not raw_articles:
            raise RuntimeError("No articles fetched from any feed. Check network connectivity.")

        # ── Step 3: Save raw articles (deduplication) ────────────────────────
        log.info("Step 3/5: Saving articles to database (deduplication)...")
        new_ids = save_articles(raw_articles)
        summary["articles_new"] = len(new_ids)
        log.info(f"  {len(new_ids)} new articles saved, {len(raw_articles) - len(new_ids)} duplicates skipped")

        # ── Step 4: Enrich with full body text ───────────────────────────────
        log.info("Step 4/5: Enriching articles with full body text...")
        new_articles = get_articles_by_ids(new_ids)
        enriched = enrich_articles(new_articles)
        enriched_count = sum(1 for a in enriched if a.get("scrape_ok"))
        summary["articles_enriched"] = enriched_count
        log.info(f"  {enriched_count}/{len(enriched)} new articles successfully enriched")


        # ── Step 4b: Update body text in DB for enriched articles ────────────
        log.info("Step 4b/5: Persisting enriched body text to database...")
        update_article_bodies(enriched)

        # ── Step 5: Cluster ──────────────────────────────────────────────────
        log.info("Step 5/5: Clustering articles by topic...")

        # Fetch from DB — all articles now have proper integer IDs and body text
        db_articles = get_recent_articles(limit=300)
        log.info(f"  Clustering {len(db_articles)} articles from database")

        clusters = cluster_articles(db_articles)
        summary["clusters_created"] = len(clusters)

        # Save clusters
        save_clusters(clusters)

        summary["status"] = "completed"

    except Exception as e:
        log.error(f"Pipeline failed: {e}", exc_info=True)
        summary["status"] = "failed"
        summary["error"] = str(e)

    finally:
        summary["elapsed_seconds"] = round(time.time() - start_time, 2)
        summary["completed_at"] = datetime.now(timezone.utc).isoformat()

    log.info(f"Pipeline finished in {summary['elapsed_seconds']}s — status: {summary['status']}")
    log.info("=" * 60)

    return summary


# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    result = run_pipeline()
    # Print JSON summary to stdout — Node.js backend reads this
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["status"] == "completed" else 1)
