# Database Schema

Initial entities:

- `users`: authentication profile and preferences.
- `accounts`: linked investment accounts.
- `positions`: current holdings and cost basis.
- `instruments`: stocks, ETFs, sectors, and metadata.
- `market_prices`: OHLCV time series.
- `news_items`: normalized news and sentiment metadata.
- `indicators`: computed technical and fundamental indicators.
- `scores`: strategy scoring outputs by instrument and date.
- `trade_plans`: proposed entries, exits, sizing, and rationale.
- `orders`: broker order intent and execution status.
- `backtests`: strategy run configuration and aggregate results.
- `backtest_trades`: simulated trades and performance attribution.
