from __future__ import annotations

import logging
from datetime import date, datetime

import pandas as pd
import requests


logger = logging.getLogger(__name__)

TWSE_STOCK_DAY_URL = "https://www.twse.com.tw/exchangeReport/STOCK_DAY"
DEFAULT_TIMEOUT = 10


def _format_twse_date(value: str | date) -> str:
    if isinstance(value, date):
        return value.strftime("%Y%m%d")
    if "-" in value:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%Y%m%d")
    return value


def fetch_twse_daily_stock(date: str | date, stock_no: str) -> pd.DataFrame:
    """Fetch TWSE daily stock data for one stock and one month.

    TWSE ``STOCK_DAY`` returns monthly rows for the month of ``date``. The
    structure is intentionally simple so it can be swapped to TWSE OpenAPI later.
    Returns an empty DataFrame if TWSE is unavailable or returns no rows.
    """
    try:
        response = requests.get(
            TWSE_STOCK_DAY_URL,
            params={
                "response": "json",
                "date": _format_twse_date(date),
                "stockNo": stock_no,
            },
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("data") or []
        fields = payload.get("fields") or []
        if not rows:
            logger.warning("TWSE returned no rows for stock_no=%s date=%s", stock_no, date)
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=fields)
    except Exception as exc:
        logger.exception("Failed to fetch TWSE data for %s: %s", stock_no, exc)
        return pd.DataFrame()
