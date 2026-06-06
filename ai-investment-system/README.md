# AI Investment System

AI-assisted investment research, strategy scoring, trade planning, newsletter generation, and backtesting platform.

## Project Structure

- `docs/`: System, API, strategy, database, and roadmap specifications.
- `backend/`: FastAPI application, domain services, database access, and migrations.
- `worker/`: Scheduled jobs for market data, newsletters, and backtests.
- `frontend/`: Vite + React client application.

## Getting Started

```bash
docker compose up --build
```

Backend API:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Notes

This repository is an initial scaffold. External market data, broker integrations, and AI providers should be configured through environment variables before production use.
