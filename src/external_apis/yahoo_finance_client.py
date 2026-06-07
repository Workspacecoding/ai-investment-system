from __future__ import annotations

import logging
from datetime import date

import pandas as pd


logger = logging.getLogger(__name__)


def fetch_stock_history(
    symbol: str,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
    period: str = "10y",
) -> pd.DataFrame:
    """Fetch historical price data from Yahoo Finance via yfinance.

    Supports normal symbols, Taiwan symbols such as ``2330.TW``, and FX pairs
    such as ``USDTWD=X``. On any error, returns an empty DataFrame so callers can
    continue the pipeline without crashing.
    """
    try:
        import yfinance as yf

        ticker = yf.Ticker(symbol)
        if start_date or end_date:
            df = ticker.history(start=start_date, end=end_date, auto_adjust=False)
        else:
            df = ticker.history(period=period, auto_adjust=False)

        if df is None or df.empty:
            logger.warning("Yahoo Finance returned no data for symbol=%s", symbol)
            return pd.DataFrame()

        df = df.reset_index()
        df.columns = [str(column).lower().replace(" ", "_") for column in df.columns]
        return df
    except Exception as exc:
        logger.exception("Failed to fetch Yahoo Finance history for %s: %s", symbol, exc)
        return pd.DataFrame()
