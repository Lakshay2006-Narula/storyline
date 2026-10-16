"""
config.py — Central configuration for News Pulse scraper.
All secrets loaded from .env file.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── RSS Feed Sources ──────────────────────────────────────────────────────────
RSS_FEEDS = [
    {
        "name": "BBC News",
        "url": "http://feeds.bbci.co.uk/news/rss.xml",
        "source_id": "bbc",
    },
    {
        "name": "NPR News",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "source_id": "npr",
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "source_id": "aljazeera",
    },
    {
        "name": "Reuters",
        "url": "https://feeds.reuters.com/reuters/topNews",
        "source_id": "reuters",
    },
]

# ─── Database ──────────────────────────────────────────────────────────────────
# Use DATABASE_URL for PostgreSQL (e.g. Neon/Supabase) or leave empty to use SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "")  # e.g. postgresql://user:pass@host/db
SQLITE_PATH = os.getenv("SQLITE_PATH", "news_pulse.db")

# ─── Scraper Settings ──────────────────────────────────────────────────────────
REQUEST_TIMEOUT = 15          # seconds per HTTP request
REQUEST_DELAY = 1.0           # seconds between article fetch requests (be polite)
MAX_ARTICLES_PER_FEED = 30    # cap per feed per run

# ─── Clustering Settings ───────────────────────────────────────────────────────
MIN_CLUSTER_SIZE = 2          # discard singleton clusters
COSINE_THRESHOLD = 0.15       # minimum similarity to merge articles into a cluster
MAX_FEATURES = 5000           # TF-IDF vocabulary size
TOP_KEYWORDS_PER_CLUSTER = 4  # keywords shown in auto-generated cluster label

# ─── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
