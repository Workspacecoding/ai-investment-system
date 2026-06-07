from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.routers.auth import router as auth_router
from app.routers.backtesting import router as backtesting_router
from app.routers.goals import router as goals_router
from app.routers.indicators import router as indicators_router
from app.routers.industry import router as industry_router
from app.routers.market import router as market_router
from app.routers.paper_trading import router as paper_trading_router
from app.routers.performance import router as performance_router
from app.routers.price_levels import router as price_levels_router
from app.routers.scores import router as scores_router
from app.routers.settings import router as settings_router
from app.routers.trade_plans import router as trade_plans_router
from app.routers.universe import router as universe_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(goals_router)
app.include_router(market_router)
app.include_router(industry_router)
app.include_router(universe_router)
app.include_router(indicators_router)
app.include_router(price_levels_router)
app.include_router(scores_router)
app.include_router(trade_plans_router)
app.include_router(paper_trading_router)
app.include_router(performance_router)
app.include_router(backtesting_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def db_health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected",
    }
