"""
article_extractor.py — Full article body extraction for News Pulse.

Strategy (in order of preference):
  1. trafilatura  — best-in-class boilerplate remover, handles paywalls gracefully
  2. BeautifulSoup fallback — extract <p> tags from <article> or <main>
  3. Graceful degradation — if both fail, body stays None (RSS summary is used)

Rate-limited with configurable delay to be polite to news servers.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
import trafilatura
from bs4 import BeautifulSoup

from config import REQUEST_TIMEOUT, REQUEST_DELAY

log = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


# ─── Extraction Strategies ─────────────────────────────────────────────────────

def _extract_with_trafilatura(html: str) -> str | None:
    """Use trafilatura for main content extraction."""
    try:
        text = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            favor_precision=True,
        )
        if text and len(text.strip()) > 100:
            return text.strip()
    except Exception as e:
        log.debug(f"Trafilatura failed: {e}")
    return None


def _extract_with_bs4(html: str) -> str | None:
    """
    BeautifulSoup fallback: look for <article> or <main> first,
    then fall back to all <p> tags.
    """
    try:
        soup = BeautifulSoup(html, "lxml")

        # Remove noisy elements
        for tag in soup(["script", "style", "nav", "header", "footer",
                         "aside", "figure", "figcaption", "noscript"]):
            tag.decompose()

        # Prefer semantic content containers
        container = (
            soup.find("article")
            or soup.find("main")
            or soup.find(attrs={"class": lambda c: c and "article" in " ".join(c).lower()})
            or soup.body
        )

        if container:
            paragraphs = container.find_all("p")
            text = " ".join(p.get_text(" ", strip=True) for p in paragraphs)
            text = text.strip()
            if len(text) > 100:
                return text
    except Exception as e:
        log.debug(f"BS4 extraction failed: {e}")
    return None


# ─── Single Article Fetcher ────────────────────────────────────────────────────

def fetch_article_body(article: dict) -> dict:
    """
    Fetch the full body of a single article. Returns the article dict
    with 'body' and 'scrape_ok' fields updated in-place.
    Never raises — all errors produce scrape_ok=False.
    """
    url = article.get("url", "")
    if not url:
        return article

    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers=_HEADERS)
        resp.raise_for_status()
        html = resp.text
    except requests.exceptions.Timeout:
        log.warning(f"Timeout fetching article: {url}")
        return article
    except requests.exceptions.TooManyRedirects:
        log.warning(f"Too many redirects for: {url}")
        return article
    except requests.exceptions.RequestException as e:
        # 403 Forbidden, 404, etc. — common for paywalled sites
        log.debug(f"HTTP error for {url}: {e}")
        return article
    except Exception as e:
        log.error(f"Unexpected error fetching {url}: {e}")
        return article

    # Try trafilatura first, then BS4 fallback
    body = _extract_with_trafilatura(html) or _extract_with_bs4(html)

    if body:
        article["body"] = body[:5000]   # cap at 5000 chars for storage efficiency
        article["scrape_ok"] = True
        log.debug(f"Extracted {len(body)} chars from {url}")
    else:
        log.debug(f"No body extracted from {url} — will use summary")

    return article


# ─── Batch Extraction ──────────────────────────────────────────────────────────

def enrich_articles(articles: list[dict], max_workers: int = 5) -> list[dict]:
    """
    Enrich a list of articles with full body text.
    Uses a ThreadPoolExecutor to parallelize HTTP requests while
    respecting a per-request delay to avoid hammering news servers.

    Returns the enriched articles list (same objects, mutated in-place).
    """
    if not articles:
        return articles

    log.info(f"Enriching {len(articles)} articles with full body text...")
    enriched_count = 0

    # Sequential with delay to be polite (more reliable than aggressive parallel)
    # For production, increase max_workers and handle rate limiting properly
    for i, article in enumerate(articles):
        if i > 0:
            time.sleep(REQUEST_DELAY)

        fetch_article_body(article)

        if article.get("scrape_ok"):
            enriched_count += 1

        # Progress logging every 10 articles
        if (i + 1) % 10 == 0:
            log.info(f"  Progress: {i+1}/{len(articles)} articles processed "
                     f"({enriched_count} with body text)")

    log.info(
        f"Enrichment complete: {enriched_count}/{len(articles)} articles "
        f"successfully extracted body text"
    )
    return articles
