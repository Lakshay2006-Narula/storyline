"""
rss_parser.py — Robust RSS/Atom feed fetcher for News Pulse.

Handles:
  - Inconsistent pubDate formats across outlets
  - Missing/malformed tags gracefully
  - Per-feed timeout and error isolation (one broken feed won't stop the run)
"""

import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

from config import RSS_FEEDS, REQUEST_TIMEOUT, MAX_ARTICLES_PER_FEED

log = logging.getLogger(__name__)

# ─── Date Normalisation ────────────────────────────────────────────────────────

def _normalise_date(raw: str | None) -> str | None:
    """
    Try multiple date parsing strategies and always return ISO 8601 UTC string
    or None if parsing fails.
    """
    if not raw:
        return None
    raw = raw.strip()

    # Strategy 1: RFC 2822 (standard RSS pubDate)
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat()
    except Exception:
        pass

    # Strategy 2: ISO 8601 variants (Atom, BBC, Guardian)
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except ValueError:
            pass

    # Strategy 3: feedparser's parsed time struct
    log.debug(f"Could not parse date: {raw!r}")
    return None


def _extract_date_from_entry(entry) -> str | None:
    """Try feedparser's auto-parsed date first, then raw string fallbacks."""
    # feedparser populates these when it successfully parses the date
    for attr in ("published_parsed", "updated_parsed"):
        ts = getattr(entry, attr, None)
        if ts:
            try:
                return datetime(*ts[:6], tzinfo=timezone.utc).isoformat()
            except Exception:
                pass

    # Fall back to raw string fields
    for attr in ("published", "updated", "dc_date"):
        raw = getattr(entry, attr, None)
        if raw:
            result = _normalise_date(raw)
            if result:
                return result

    return None


# ─── Field Extraction ──────────────────────────────────────────────────────────

def _clean_html(text: str | None) -> str:
    """Strip HTML tags and collapse whitespace."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_summary(entry) -> str:
    """
    Extract best-available summary text. Outlets differ:
      - BBC uses <description> (HTML)
      - NPR uses <content:encoded>
      - Guardian uses <content:encoded> or <description>
    """
    # Prefer content:encoded (longer, richer)
    for attr in ("content", "summary_detail", "description"):
        val = getattr(entry, attr, None)
        if val:
            if isinstance(val, list) and val:
                val = val[0].get("value", "")
            if isinstance(val, dict):
                val = val.get("value", "")
            cleaned = _clean_html(str(val))
            if len(cleaned) > 40:
                return cleaned[:1000]  # cap at 1000 chars for summary

    return ""


def _extract_url(entry) -> str | None:
    """Get canonical article URL."""
    # feedparser's 'link' is usually correct
    url = getattr(entry, "link", None)
    if url:
        return url.strip()
    # fallback: id is often the URL in Atom feeds
    eid = getattr(entry, "id", None)
    if eid and eid.startswith("http"):
        return eid.strip()
    return None


# ─── Feed Fetching ─────────────────────────────────────────────────────────────

def _fetch_feed(source: dict) -> list[dict]:
    """
    Fetch and parse one RSS/Atom feed. Returns a list of article dicts.
    Never raises — errors are logged and an empty list is returned so the
    pipeline continues processing other feeds.
    """
    name = source["name"]
    url = source["url"]
    source_id = source["source_id"]

    log.info(f"Fetching feed: {name} ({url})")
    try:
        # Use requests for better control over timeouts and headers
        resp = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={
                "User-Agent": "NewsPulse/1.0 (+https://github.com/newspulse)",
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
            },
        )
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
    except requests.exceptions.Timeout:
        log.warning(f"[{name}] Feed fetch timed out after {REQUEST_TIMEOUT}s — skipping")
        return []
    except requests.exceptions.RequestException as e:
        log.warning(f"[{name}] Feed fetch failed: {e} — skipping")
        return []
    except Exception as e:
        log.error(f"[{name}] Unexpected error fetching feed: {e}")
        return []

    if feed.bozo and not feed.entries:
        log.warning(f"[{name}] Feed parse error (bozo): {feed.bozo_exception} — skipping")
        return []

    articles = []
    entries = feed.entries[:MAX_ARTICLES_PER_FEED]
    log.info(f"[{name}] Parsing {len(entries)} entries")

    for entry in entries:
        url = _extract_url(entry)
        if not url:
            log.debug(f"[{name}] Entry missing URL — skipping")
            continue

        headline = _clean_html(getattr(entry, "title", None)) or "No headline"
        summary = _extract_summary(entry)
        published_at = _extract_date_from_entry(entry)

        articles.append(
            {
                "url": url,
                "headline": headline,
                "summary": summary,
                "body": None,           # filled by article_extractor.py
                "source_id": source_id,
                "source_name": name,
                "published_at": published_at,
                "scrape_ok": False,
            }
        )

    log.info(f"[{name}] Extracted {len(articles)} articles")
    return articles


# ─── Public API ────────────────────────────────────────────────────────────────

def fetch_all_feeds(feeds: list[dict] | None = None) -> list[dict]:
    """
    Fetch all configured RSS feeds. 
    Returns combined flat list of article dicts.
    """
    feeds = feeds or RSS_FEEDS
    all_articles = []

    for source in feeds:
        articles = _fetch_feed(source)
        all_articles.extend(articles)

    log.info(f"Total articles fetched from {len(feeds)} feeds: {len(all_articles)}")
    return all_articles
