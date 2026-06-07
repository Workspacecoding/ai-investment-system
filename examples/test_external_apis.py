from __future__ import annotations

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.external_apis.gmail_notifier import send_email  # noqa: E402
from src.external_apis.google_news_client import fetch_stock_news  # noqa: E402
from src.external_apis.technical_indicator_service import calculate_basic_indicators  # noqa: E402
from src.external_apis.yahoo_finance_client import fetch_stock_history  # noqa: E402


def main() -> None:
    print("Fetching 2330.TW 10-year price history...")
    tsmc_history = fetch_stock_history("2330.TW", period="10y")
    print(tsmc_history.tail())

    print("Fetching USD/TWD exchange rate...")
    usd_twd = fetch_stock_history("USDTWD=X", period="10y")
    print(usd_twd.tail())

    print("Calculating technical indicators for 2330.TW...")
    indicators = calculate_basic_indicators(tsmc_history)
    indicator_columns = [
        column
        for column in ["date", "close", "ma5", "ma20", "ma60", "rsi14", "macd"]
        if column in indicators.columns
    ]
    if indicator_columns:
        print(indicators[indicator_columns].tail())
    else:
        print("No indicator data available.")

    print("Fetching Google News RSS...")
    news = fetch_stock_news("台積電 2330", limit=5)
    for article in news:
        print(f"- {article['title']} ({article['source']})")

    # Gmail test is intentionally commented out to avoid accidental emails.
    # send_email(
    #     subject="AI Investment System 測試通知",
    #     body="這是一封 Gmail SMTP 測試信。",
    # )


if __name__ == "__main__":
    main()
