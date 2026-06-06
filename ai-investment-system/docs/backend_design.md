# Backend Design

The backend is a FastAPI service organized by domain services. Routers expose API boundaries, schemas define request and response contracts, models represent persisted data, and services contain business logic.

Core modules:

- `core`: configuration, auth, logging, and shared app settings.
- `services`: account, market, ETF, news, industry, universe, indicators, scoring, strategy, trade planning, risk, AI, newsletter, trading, performance, and backtest domains.
- `strategies`: reusable strategy implementations.
- `database.py`: SQLAlchemy engine and session setup.
