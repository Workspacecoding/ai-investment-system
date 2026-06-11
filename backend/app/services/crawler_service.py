import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)


def _to_yf_symbol(symbol: str, market: str) -> str:
    """Convert internal symbol to Yahoo Finance ticker."""
    if market in ("TW", "TWO"):
        return f"{symbol}.TW"
    if market == "HK":
        return f"{symbol}.HK"
    return symbol


def fetch_daily_prices(symbol: str, market: str, start_date: date, end_date: date) -> list[dict]:
    """
    Fetch OHLCV price data from Yahoo Finance.
    Falls back to empty list on any error so callers are not broken.
    """
    try:
        import yfinance as yf  # noqa: PLC0415

        yf_symbol = _to_yf_symbol(symbol, market)
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(
            start=str(start_date),
            end=str(end_date + timedelta(days=1)),
            auto_adjust=True,
        )

        if hist.empty:
            logger.warning("yfinance returned no data for %s (start=%s end=%s)", yf_symbol, start_date, end_date)
            return []

        prices: list[dict] = []
        for ts, row in hist.iterrows():
            trade_dt = ts.date() if hasattr(ts, "date") else ts
            prices.append(
                {
                    "trade_date": trade_dt,
                    "open_price": round(float(row["Open"]), 4),
                    "high_price": round(float(row["High"]), 4),
                    "low_price": round(float(row["Low"]), 4),
                    "close_price": round(float(row["Close"]), 4),
                    "volume": int(row["Volume"]),
                }
            )
        return prices

    except ImportError:
        logger.error("yfinance not installed. Run: pip install yfinance")
        return _mock_prices(symbol, start_date, end_date)
    except Exception as exc:
        logger.error("Yahoo Finance fetch failed for %s: %s", symbol, exc)
        return []


def _mock_prices(symbol: str, start_date: date, end_date: date) -> list[dict]:
    """Fallback mock used only when yfinance is unavailable."""
    prices = []
    current_date = start_date
    base_price = max(len(symbol) * 10, 20)
    day_index = 0
    while current_date <= end_date:
        if current_date.weekday() < 5:
            close_price = round(base_price + (day_index * 0.03), 4)
            prices.append(
                {
                    "trade_date": current_date,
                    "open_price": round(close_price * 0.99, 4),
                    "high_price": round(close_price * 1.01, 4),
                    "low_price": round(close_price * 0.98, 4),
                    "close_price": close_price,
                    "volume": 100000 + day_index,
                }
            )
        current_date += timedelta(days=1)
        day_index += 1
    return prices
