from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.routers.auth import router as auth_router
from app.routers.goals import router as goals_router
from app.routers.industry import router as industry_router
from app.routers.market import router as market_router
from app.routers.settings import router as settings_router
from app.routers.universe import router as universe_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(goals_router)
app.include_router(market_router)
app.include_router(industry_router)
app.include_router(universe_router)


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
