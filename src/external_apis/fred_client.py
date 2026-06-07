from __future__ import annotations

import logging
import os

import pandas as pd
import requests
from dotenv import load_dotenv


logger = logging.getLogger(__name__)

FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations"
DEFAULT_TIMEOUT = 15


def _fetch_fred_series(series_id: str) -> pd.DataFrame:
    load_dotenv()
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        logger.warning("FRED_API_KEY is not set; returning empty DataFrame for %s", series_id)
        return pd.DataFrame()

    try:
        response = requests.get(
            FRED_OBSERVATIONS_URL,
            params={
                "series_id": series_id,
                "api_key": api_key,
                "file_type": "json",
            },
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        observations = response.json().get("observations") or []
        if not observations:
            logger.warning("FRED returned no observations for series_id=%s", series_id)
            return pd.DataFrame()
        df = pd.DataFrame(observations)
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        return df
    except Exception as exc:
        logger.exception("Failed to fetch FRED series=%s: %s", series_id, exc)
        return pd.DataFrame()


def fetch_us10y_yield() -> pd.DataFrame:
    """Fetch 10-year Treasury constant maturity rate, FRED series DGS10."""
    return _fetch_fred_series("DGS10")


def fetch_fed_funds_rate() -> pd.DataFrame:
    """Fetch effective federal funds rate, FRED series FEDFUNDS."""
    return _fetch_fred_series("FEDFUNDS")
