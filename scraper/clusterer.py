"""
clusterer.py — TF-IDF + Cosine Similarity topic clustering for News Pulse.

Algorithm:
  1. Build a TF-IDF matrix from combined article text (headline + summary + body)
  2. Compute pairwise cosine similarity matrix
  3. Use Agglomerative Clustering with cosine distance and average linkage
     to group articles into topic clusters automatically
  4. Auto-label each cluster from its top TF-IDF keywords

Why TF-IDF over embeddings?
  - No GPU / API key required — works fully offline
  - TF-IDF discounts generic news words ("said", "today", "reported")
     and surfaces distinguishing topic terms
  - Fast enough for 300 articles in under 1 second
  - Easy to explain and debug in the video walkthrough
"""

import logging
import re
import string
from collections import defaultdict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    MIN_CLUSTER_SIZE,
    COSINE_THRESHOLD,
    MAX_FEATURES,
    TOP_KEYWORDS_PER_CLUSTER,
)

log = logging.getLogger(__name__)

# ─── NLTK Stop Words (extended for news) ──────────────────────────────────────

_NEWS_STOPWORDS = {
    # Standard English
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "and",
    "but", "or", "nor", "so", "yet", "both", "either", "neither",
    "not", "only", "own", "same", "than", "too", "very", "just",
    "about", "after", "also", "back", "even", "most", "other", "over",
    "such", "there", "these", "this", "those", "up", "use", "it", "its",
    "that", "they", "their", "them", "we", "our", "us", "he", "she",
    "him", "her", "his", "i", "me", "my", "you", "your",
    # News boilerplate & media captions
    "said", "say", "says", "told", "report", "reported", "reports",
    "according", "news", "new", "latest", "breaking", "update", "updates",
    "today", "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "sunday", "week", "month", "year", "time", "day", "days",
    "mr", "ms", "mrs", "dr", "people", "person", "official", "officials",
    "government", "country", "world", "also", "amid", "reuters", "ap",
    "bbc", "npr", "aljazeera", "guardian", "inc", "corp", "co",
    "image", "credit", "image credit", "getty", "images", "photo", "caption",
    "copyright", "share", "follow", "read", "story", "stories", "list",
    "click", "video", "watch", "listen", "audio", "view", "full", "post",
    "sign", "newsletter", "live", "like", "how", "why", "what", "where",
    "when", "under", "bare", "all", "now", "two", "one", "three", "four",
    "first", "last", "get", "got", "take", "make", "made", "way", "still",
    "well", "much", "many", "little", "big", "know", "see", "think", "good",
    "come", "came", "give", "look", "source", "reproduced", "rights", "reserved",
    "page", "link", "advertisement", "subscribe", "registered",
}


# ─── Text Preparation ──────────────────────────────────────────────────────────

def _prepare_text(article: dict) -> str:
    """
    Combine headline (weighted 3x), summary (2x), and body (1x) into
    a single string for TF-IDF. Weighting done by repetition so that
    headlines have more influence on cluster assignment.
    """
    headline = article.get("headline") or ""
    summary = article.get("summary") or ""
    body = article.get("body") or ""

    # Truncate body to first 500 chars for clustering (rest is storage detail)
    body_snippet = body[:500]

    # Headline repeated 3x, summary 2x for implicit weighting
    combined = f"{headline} {headline} {headline} {summary} {summary} {body_snippet}"

    # Basic cleaning: lowercase, remove punctuation, collapse spaces
    combined = combined.lower()
    combined = re.sub(r"https?://\S+", " ", combined)   # remove URLs
    combined = combined.translate(str.maketrans("", "", string.punctuation))
    combined = re.sub(r"\d+", " ", combined)             # remove standalone numbers
    combined = re.sub(r"\s+", " ", combined).strip()

    return combined


# ─── Clustering ────────────────────────────────────────────────────────────────

def _auto_label_cluster(article_ids: list[int], articles_data: list[dict], tfidf_matrix, feature_names: list[str], idx_map: dict[int, int]) -> tuple[str, list[str]]:
    """
    Generate a human-readable cluster label and keyword list.
    1. Selects the most representative headline (closest to cluster centroid).
    2. Selects top domain keywords (excluding media/boilerplate stopwords).
    """
    matrix_indices = [idx_map[aid] for aid in article_ids if aid in idx_map]
    if not matrix_indices:
        return "General News", ["News"]

    # Cluster centroid in TF-IDF space
    cluster_submatrix = tfidf_matrix[matrix_indices]
    centroid = np.asarray(cluster_submatrix.mean(axis=0)).flatten()

    # Find the article whose vector is most similar to the cluster centroid
    sims = cosine_similarity(cluster_submatrix, centroid.reshape(1, -1)).flatten()
    best_local_idx = int(np.argmax(sims))
    best_article_id = article_ids[best_local_idx] if best_local_idx < len(article_ids) else article_ids[0]

    # Find the headline of that best article
    rep_headline = "Topic Cluster"
    for art in articles_data:
        if art.get("id") == best_article_id:
            h = (art.get("headline") or "").strip()
            if h and len(h) > 8:
                h = re.sub(r"^(BBC News|NPR|Al Jazeera)\s*[-:|]\s*", "", h, flags=re.I)
                rep_headline = h
                break

    if len(rep_headline) > 65:
        rep_headline = rep_headline[:62].rsplit(" ", 1)[0] + "…"

    # Keywords from top TF-IDF terms
    cluster_scores = np.asarray(cluster_submatrix.sum(axis=0)).flatten()
    top_indices = cluster_scores.argsort()[::-1][:TOP_KEYWORDS_PER_CLUSTER * 4]

    keywords = []
    for i in top_indices:
        word = feature_names[i].strip()
        if word not in _NEWS_STOPWORDS and len(word) > 2 and not word.isdigit():
            parts = word.split()
            if any(p in _NEWS_STOPWORDS for p in parts):
                continue
            keywords.append(word.title())
        if len(keywords) >= TOP_KEYWORDS_PER_CLUSTER:
            break

    if not keywords:
        keywords = ["News", "Current Events"]

    return rep_headline, keywords


def cluster_articles(articles: list[dict]) -> list[dict]:
    """
    Main clustering function.

    Input:  list of article dicts (with id, headline, summary, body, published_at)
    Output: list of cluster dicts:
        {
          "label": str,
          "keywords": list[str],
          "article_ids": list[int],
          "articles": list[dict],   # full article data for convenience
          "earliest_at": str | None,
          "latest_at":   str | None,
        }
    """
    if not articles:
        log.warning("No articles to cluster")
        return []

    log.info(f"Clustering {len(articles)} articles...")

    # ── Step 1: Prepare corpus ───────────────────────────────────────────────
    texts = [_prepare_text(art) for art in articles]
    article_ids = [art["id"] for art in articles]
    idx_map = {aid: i for i, aid in enumerate(article_ids)}  # id → matrix row

    # Filter out empty texts
    valid_mask = [bool(t.strip()) for t in texts]
    if sum(valid_mask) < 2:
        log.warning("Not enough valid texts to cluster")
        return []

    valid_articles = [a for a, v in zip(articles, valid_mask) if v]
    valid_texts = [t for t, v in zip(texts, valid_mask) if v]
    valid_ids = [a["id"] for a in valid_articles]
    idx_map = {aid: i for i, aid in enumerate(valid_ids)}

    # ── Step 2: TF-IDF vectorization ─────────────────────────────────────────
    vectorizer = TfidfVectorizer(
        max_features=MAX_FEATURES,
        stop_words=list(_NEWS_STOPWORDS),
        ngram_range=(1, 2),       # unigrams + bigrams for better topic capture
        min_df=2,                 # term must appear in at least 2 docs
        max_df=0.85,              # ignore terms in >85% of docs (too generic)
        sublinear_tf=True,        # apply log(1+tf) to dampen high frequencies
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(valid_texts)
    except ValueError as e:
        log.error(f"TF-IDF vectorization failed: {e}")
        return []

    feature_names = vectorizer.get_feature_names_out().tolist()
    log.info(f"TF-IDF matrix: {tfidf_matrix.shape[0]} docs × {tfidf_matrix.shape[1]} terms")

    # ── Step 3: Agglomerative Clustering ─────────────────────────────────────
    # Use a similarity-derived distance cutoff consistently. A fixed
    # sqrt-based cluster count can split related stories or force unrelated
    # articles together depending only on how many articles were fetched.

    n_samples = tfidf_matrix.shape[0]

    log.info(f"Clustering {n_samples} articles with cosine similarity threshold {COSINE_THRESHOLD}")

    try:
        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1 - COSINE_THRESHOLD,
            metric="cosine",
            linkage="average",
        )
        labels = clustering.fit_predict(tfidf_matrix.toarray())
    except Exception as e:
        log.error(f"Clustering failed: {e}")
        return []

    # ── Step 4: Group articles by cluster label ───────────────────────────────
    cluster_groups: dict[int, list[int]] = defaultdict(list)
    for art_id, cluster_label in zip(valid_ids, labels):
        cluster_groups[int(cluster_label)].append(art_id)

    # ── Step 5: Build output, filter tiny clusters, auto-label ───────────────
    article_lookup = {art["id"]: art for art in valid_articles}
    results = []

    for cluster_label, art_ids in cluster_groups.items():
        if len(art_ids) < MIN_CLUSTER_SIZE:
            log.debug(f"Discarding singleton cluster {cluster_label}")
            continue

        cluster_articles_data = [article_lookup[aid] for aid in art_ids if aid in article_lookup]

        # Date range — sanitize outlier dates (> 60 days before latest)
        dates = [
            a["published_at"]
            for a in cluster_articles_data
            if a.get("published_at")
        ]
        dates.sort()
        latest = dates[-1] if dates else None
        
        # If latest is known, filter out any date older than 30 days from latest
        # to prevent corrupt 2025/ancient dates from destroying timeline scaling
        valid_dates = dates
        if latest:
            try:
                from datetime import datetime, timezone, timedelta
                latest_dt = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                min_threshold = latest_dt - timedelta(days=30)
                valid_dates = [
                    d for d in dates
                    if datetime.fromisoformat(d.replace("Z", "+00:00")) >= min_threshold
                ] or dates
            except Exception:
                valid_dates = dates

        earliest = valid_dates[0] if valid_dates else None

        # Auto-label from representative headline + TF-IDF keywords
        label, keywords = _auto_label_cluster(art_ids, cluster_articles_data, tfidf_matrix, feature_names, idx_map)

        results.append(
            {
                "label": label,
                "keywords": keywords,
                "article_ids": art_ids,
                "articles": cluster_articles_data,
                "earliest_at": earliest,
                "latest_at": latest,
            }
        )

    # Sort clusters by most recent activity
    results.sort(key=lambda c: c.get("latest_at") or "", reverse=True)

    log.info(f"Produced {len(results)} topic clusters from {len(valid_articles)} articles")
    return results
