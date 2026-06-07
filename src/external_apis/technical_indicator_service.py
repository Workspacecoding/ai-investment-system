from __future__ import annotations

import logging

import pandas as pd


logger = logging.getLogger(__name__)


def _find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:
    normalized = {str(column).lower(): column for column in df.columns}
    for candidate in candidates:
        if candidate.lower() in normalized:
            return normalized[candidate.lower()]
    return None


def calculate_basic_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate MA5, MA20, MA60, RSI14, and MACD columns.

    The input DataFrame should contain close price data. High/low/open/volume are
    not required for this basic version. Returns a copy of the original DataFrame
    with indicator columns. If calculation fails, returns the original copy.
    """
    result = df.copy()
    if result.empty:
        logger.warning("Cannot calculate indicators for an empty DataFrame")
        return result

    close_column = _find_column(result, ("close", "close_price", "Close", "Close_price"))
    if not close_column:
        logger.warning("Cannot calculate indicators because close price column is missing")
        return result

    try:
        from ta.momentum import RSIIndicator
        from ta.trend import MACD, SMAIndicator

        close = pd.to_numeric(result[close_column], errors="coerce")
        result["ma5"] = SMAIndicator(close=close, window=5, fillna=False).sma_indicator()
        result["ma20"] = SMAIndicator(close=close, window=20, fillna=False).sma_indicator()
        result["ma60"] = SMAIndicator(close=close, window=60, fillna=False).sma_indicator()
        result["rsi14"] = RSIIndicator(close=close, window=14, fillna=False).rsi()

        macd = MACD(close=close, window_slow=26, window_fast=12, window_sign=9, fillna=False)
        result["macd"] = macd.macd()
        result["macd_signal"] = macd.macd_signal()
        result["macd_diff"] = macd.macd_diff()
        return result
    except Exception as exc:
        logger.exception("Failed to calculate technical indicators: %s", exc)
        return result
