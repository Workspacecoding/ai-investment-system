# API Spec

Base path: `/api/v1`

Planned endpoints:

- `GET /health`: service health.
- `GET /market/universe`: searchable instrument universe.
- `GET /market/instruments/{symbol}`: instrument detail.
- `GET /portfolio/summary`: positions, risk, and return summary.
- `POST /strategy/score`: score instruments for a strategy.
- `POST /trade-plans`: create a trade plan from scored candidates.
- `GET /trade-plans/{id}`: retrieve a trade plan.
- `POST /backtests`: start a backtest.
- `GET /backtests/{id}`: retrieve backtest status and results.
- `POST /newsletter/generate`: generate a newsletter issue.
