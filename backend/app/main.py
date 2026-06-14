from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
import app.models.api_config  # noqa: F401
import app.models.asset_indicator  # noqa: F401
import app.models.asset_role  # noqa: F401
import app.models.asset_role_link  # noqa: F401
import app.models.asset_type_config  # noqa: F401
import app.models.factor_corr_report  # noqa: F401
import app.models.industry_indicator_link  # noqa: F401
import app.models.market_config  # noqa: F401
import app.models.market_config_indicator_link  # noqa: F401
import app.models.analysis_model  # noqa: F401
import app.models.market_indicator_config  # noqa: F401
import app.models.asset_analysis_config  # noqa: F401
import app.models.asset_crawler_indicator  # noqa: F401
import app.models.asset_daily_data  # noqa: F401
import app.models.crawler_indicator_config  # noqa: F401
import app.models.indicator_daily_value  # noqa: F401
import app.models.market_score_snapshot  # noqa: F401
import app.models.role_config  # noqa: F401
import app.models.score_formula  # noqa: F401
import app.models.data_update_task  # noqa: F401
import app.models.strategy_wave  # noqa: F401
import app.models.strategy_position  # noqa: F401
import app.models.model_validation_record  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.daily_reports import router as daily_reports_router
from app.routers.backtesting import router as backtesting_router
from app.routers.fundamentals import router as fundamentals_router
from app.routers.goal_strategy import router as goal_strategy_router
from app.routers.goals import router as goals_router
from app.routers.indicators import router as indicators_router
from app.routers.industry import router as industry_router
from app.routers.market import router as market_router
from app.routers.news import router as news_router
from app.routers.notifications import router as notifications_router
from app.routers.paper_trading import router as paper_trading_router
from app.routers.performance import router as performance_router
from app.routers.price_levels import router as price_levels_router
from app.routers.portfolio_optimization import router as portfolio_optimization_router
from app.routers.profit_allocation import router as profit_allocation_router
from app.routers.scores import router as scores_router
from app.routers.settings import router as settings_router
from app.routers.swing_trade import router as swing_trade_router
from app.routers.trade_plans import router as trade_plans_router
from app.routers.admin import router as admin_router
from app.routers.market_analysis import router as market_analysis_router
from app.routers.swing_recommend import router as swing_recommend_router
from app.routers.universe import router as universe_router
from app.routers.data_update import router as data_update_router
from app.routers.strategies import router as strategies_router

app = FastAPI()


def _run_column_migrations() -> None:
    """Add new columns to existing tables (idempotent — ignores duplicate column errors)."""
    migration_sqls = [
        "ALTER TABLE market_configs ADD COLUMN is_tracked TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE market_configs ADD COLUMN display_order INT NOT NULL DEFAULT 0",
        "ALTER TABLE market_indicator_configs ADD COLUMN api_config_id BIGINT NULL",
        "ALTER TABLE market_indicator_configs ADD COLUMN api_source VARCHAR(100) NULL",
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
        "ALTER TABLE assets MODIFY COLUMN asset_type VARCHAR(50) NOT NULL",
        "ALTER TABLE assets ADD COLUMN description TEXT NULL",
        "ALTER TABLE assets ADD COLUMN api_config_id BIGINT NULL",
        # 架構調整：產業追蹤狀態 + 標的管理新欄位
        "ALTER TABLE industries ADD COLUMN tracking_status VARCHAR(20) NOT NULL DEFAULT 'disabled'",
        "ALTER TABLE assets ADD COLUMN api_code VARCHAR(100) NULL",
        "ALTER TABLE assets ADD COLUMN update_frequency VARCHAR(20) NULL",
        "ALTER TABLE assets ADD COLUMN in_swing_pool TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE assets ADD COLUMN in_newsletter TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE assets ADD COLUMN needs_backtest TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE score_formulas ADD COLUMN is_reverse TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE score_formulas ADD COLUMN market_code VARCHAR(20) NULL",
        "ALTER TABLE market_indicator_configs ADD COLUMN indicator_category VARCHAR(30) NULL",
        "ALTER TABLE market_configs ADD COLUMN current_model_id BIGINT NULL",
        "ALTER TABLE industries ADD COLUMN current_model_id BIGINT NULL",
        "ALTER TABLE assets ADD COLUMN current_model_id BIGINT NULL",
        "ALTER TABLE market_configs ADD COLUMN module_calc_indicator_ids JSON NULL",
        "ALTER TABLE market_configs ADD COLUMN module_validation_asset_ids JSON NULL",
        "ALTER TABLE market_configs ADD COLUMN module_validation_indicator_ids JSON NULL",
        "ALTER TABLE market_configs ADD COLUMN module_validation_period_days INT NULL DEFAULT 30",
        "ALTER TABLE market_configs ADD COLUMN module_result_indicator_ids JSON NULL",
        "ALTER TABLE analysis_models ADD COLUMN market_code VARCHAR(20) NULL",
        "ALTER TABLE market_configs ADD COLUMN module_formula_expr TEXT NULL",
        "ALTER TABLE industries ADD COLUMN module_formula_expr TEXT NULL",
        "ALTER TABLE assets ADD COLUMN module_formula_expr TEXT NULL",
        "ALTER TABLE industries ADD COLUMN module_calc_indicator_ids JSON NULL",
        "ALTER TABLE industries ADD COLUMN module_validation_asset_ids JSON NULL",
        "ALTER TABLE industries ADD COLUMN module_validation_indicator_ids JSON NULL",
        "ALTER TABLE industries ADD COLUMN module_validation_period_days INT NULL DEFAULT 30",
        "ALTER TABLE industries ADD COLUMN module_result_indicator_ids JSON NULL",
        "ALTER TABLE assets ADD COLUMN module_calc_indicator_ids JSON NULL",
        "ALTER TABLE assets ADD COLUMN module_validation_asset_ids JSON NULL",
        "ALTER TABLE assets ADD COLUMN module_validation_indicator_ids JSON NULL",
        "ALTER TABLE assets ADD COLUMN module_validation_period_days INT NULL DEFAULT 30",
        "ALTER TABLE assets ADD COLUMN module_result_indicator_ids JSON NULL",
        "ALTER TABLE market_configs ADD COLUMN module_validation_conditions TEXT NULL",
        "ALTER TABLE industries ADD COLUMN module_validation_conditions TEXT NULL",
        "ALTER TABLE assets ADD COLUMN module_validation_conditions TEXT NULL",
        "ALTER TABLE analysis_models ADD COLUMN source_id BIGINT NULL",
        "ALTER TABLE analysis_models ADD COLUMN formula_snapshot JSON NULL",
        "ALTER TABLE analysis_models ADD COLUMN validation_snapshot JSON NULL",
        "ALTER TABLE assets ADD COLUMN position_model_id BIGINT NULL",
        "ALTER TABLE assets ADD COLUMN analysis_model_id BIGINT NULL",
        "ALTER TABLE assets ADD COLUMN crawler_enabled TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE assets ADD COLUMN crawler_start_time DATETIME NULL",
        "ALTER TABLE assets ADD COLUMN crawler_stop_time DATETIME NULL",
        "ALTER TABLE assets ADD COLUMN crawler_indicator_ids JSON NULL",
        "ALTER TABLE assets ADD COLUMN crawler_years INT NOT NULL DEFAULT 10",
        # Crawler support for markets and industries
        "ALTER TABLE market_configs ADD COLUMN crawler_enabled TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE market_configs ADD COLUMN crawler_start_time DATETIME NULL",
        "ALTER TABLE market_configs ADD COLUMN crawler_stop_time DATETIME NULL",
        "ALTER TABLE market_configs ADD COLUMN crawler_years INT NOT NULL DEFAULT 10",
        "ALTER TABLE industries ADD COLUMN crawler_enabled TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE industries ADD COLUMN crawler_start_time DATETIME NULL",
        "ALTER TABLE industries ADD COLUMN crawler_stop_time DATETIME NULL",
        "ALTER TABLE industries ADD COLUMN crawler_years INT NOT NULL DEFAULT 10",
        # Model validation records extra columns
        "ALTER TABLE model_validation_records ADD COLUMN validation_indicator_id BIGINT NULL",
        "ALTER TABLE model_validation_records ADD COLUMN validation_indicator_name VARCHAR(200) NULL",
        # Validation formula management
        "ALTER TABLE score_formulas ADD COLUMN formula_expr TEXT NULL",
        "ALTER TABLE market_configs ADD COLUMN module_validation_formula_id BIGINT NULL",
        "ALTER TABLE industries ADD COLUMN module_validation_formula_id BIGINT NULL",
        "ALTER TABLE assets ADD COLUMN swing_validation_formula_id BIGINT NULL",
        "ALTER TABLE assets ADD COLUMN position_validation_formula_id BIGINT NULL",
        # Wave backtest extended fields
        "ALTER TABLE strategy_wave_backtests ADD COLUMN analysis_model_id BIGINT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN analysis_model_name VARCHAR(200) NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN validation_indicator_id BIGINT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN validation_indicator_name VARCHAR(200) NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN model_score FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN entry_price FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN exit_price FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN holding_days INT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN avg_return_pct FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN max_drawdown_pct FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN fit_rate FLOAT NULL",
        "ALTER TABLE strategy_wave_backtests ADD COLUMN notes TEXT NULL",
        # Position validation extended fields
        "ALTER TABLE strategy_position_validations ADD COLUMN analysis_model_id BIGINT NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN analysis_model_name VARCHAR(200) NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN validation_indicator_id BIGINT NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN validation_indicator_name VARCHAR(200) NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN model_score FLOAT NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN holding_days INT NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN fit_rate FLOAT NULL",
        "ALTER TABLE strategy_position_validations ADD COLUMN notes TEXT NULL",
    ]
    with engine.connect() as conn:
        for sql in migration_sqls:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


@app.on_event("startup")
def _create_tables():
    try:
        Base.metadata.create_all(bind=engine)
        _run_column_migrations()
        # Seed default market indicators if not present
        from app.database import SessionLocal
        from app.services.admin_service import (
            seed_default_asset_roles,
            seed_default_asset_types,
            seed_default_indicators,
            seed_default_roles,
            seed_default_score_formulas,
        )
        with SessionLocal() as db:
            seed_default_indicators(db)
            seed_default_score_formulas(db)
            seed_default_asset_types(db)
            seed_default_roles(db)
            seed_default_asset_roles(db)
    except Exception:
        pass  # DB may be sleeping; tables will exist from prior run
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(goals_router)
app.include_router(goal_strategy_router)
app.include_router(market_router)
app.include_router(news_router)
app.include_router(notifications_router)
app.include_router(industry_router)
app.include_router(universe_router)
app.include_router(indicators_router)
app.include_router(fundamentals_router)
app.include_router(price_levels_router)
app.include_router(scores_router)
app.include_router(swing_trade_router)
app.include_router(trade_plans_router)
app.include_router(paper_trading_router)
app.include_router(performance_router)
app.include_router(profit_allocation_router)
app.include_router(portfolio_optimization_router)
app.include_router(backtesting_router)
app.include_router(daily_reports_router)
app.include_router(admin_router)
app.include_router(market_analysis_router)
app.include_router(swing_recommend_router)
app.include_router(data_update_router)
app.include_router(strategies_router)


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
