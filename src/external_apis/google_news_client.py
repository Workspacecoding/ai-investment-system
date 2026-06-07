from __future__ import annotations

import logging
from urllib.parse import quote_plus

import feedparser
import requests


logger = logging.getLogger(__name__)

GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"
DEFAULT_TIMEOUT = 10


def fetch_stock_news(keyword: str, limit: int = 10) -> list[dict]:
    """Fetch Google News RSS entries for a keyword.

    Returns an empty list when the RSS request or parsing fails. This is a light
    news collector, not a full licensed news API.
    """
    query = quote_plus(keyword)
    url = f"{GOOGLE_NEWS_RSS_URL}?q={query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    try:
        response = requests.get(url, timeout=DEFAULT_TIMEOUT)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        if getattr(feed, "bozo", False):
            logger.warning("Google News RSS parse warning for keyword=%s", keyword)

        articles = []
        for entry in feed.entries[:limit]:
            articles.append(
                {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", ""),
                    "source": (entry.get("source") or {}).get("title", ""),
                }
            )
        return articles
    except Exception as exc:
        logger.exception("Failed to fetch Google News RSS for %s: %s", keyword, exc)
        return []
