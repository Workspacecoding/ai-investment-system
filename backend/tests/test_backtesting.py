import sys
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.asset import Asset, RecommendedAsset, UserWatchlist  # noqa: E402
from app.models.backtest import BacktestRun, BacktestTrade, FactorBacktestResult  # noqa: E402
from app.models.factor import FactorScore  # noqa: E402
from app.models.price import AssetPrice  # noqa: E402
from app.models.trade_plan import TradePlan  # noqa: E402


client = TestClient(app)


def cleanup_asset(symbol: str, market: str = "US"):
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.symbol == symbol, Asset.market == market).first()
        if asset:
            db.query(BacktestTrade).filter(BacktestTrade.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(TradePlan).filter(TradePlan.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(FactorScore).filter(FactorScore.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(AssetPrice).filter(AssetPrice.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(UserWatchlist).filter(UserWatchlist.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.query(RecommendedAsset).filter(RecommendedAsset.asset_id == asset.id).delete(
                synchronize_session=False
            )
            db.delete(asset)
            db.commit()
    finally:
        db.close()


def cleanup_backtests(name_prefix: str, factor_prefix: str):
    db = SessionLocal()
    try:
        run_ids = [
            item.id
            for item in db.query(BacktestRun)
            .filter(BacktestRun.name.like(f"{name_prefix}%"))
            .all()
        ]
        if run_ids:
            db.query(BacktestTrade).filter(
                BacktestTrade.backtest_run_id.in_(run_ids)
            ).delete(synchronize_session=False)
            db.query(BacktestRun).filter(BacktestRun.id.in_(run_ids)).delete(
                synchronize_session=False
            )
        db.query(FactorBacktestResult).filter(
            FactorBacktestResult.factor_name.like(f"{factor_prefix}%")
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def seed_asset(symbol: str) -> int:
    db = SessionLocal()
    try:
        asset = Asset(
            symbol=symbol,
            name=f"{symbol} Backtest Asset",
            market="US",
            asset_type="stock",
            industry_id=None,
            currency="USD",
            is_penny_stock=False,
            is_active=True,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset.id
    finally:
        db.close()


def seed_prices(asset_id: int, start_date: date, closes: list[float]):
    db = SessionLocal()
    try:
        for index, close in enumerate(closes):
            trade_date = start_date + timedelta(days=index)
            db.add(
                AssetPrice(
                    asset_id=asset_id,
                    trade_date=trade_date,
                    open_price=close,
                    high_price=close + 1,
                    low_price=close - 1,
                    close_price=close,
                    volume=1000 + index,
                )
            )
        db.commit()
    finally:
        db.close()


def seed_trade_plan(asset_id: int, trade_date: date, strategy_type: str):
    db = SessionLocal()
    try:
        db.add(
            TradePlan(
                asset_id=asset_id,
                trade_date=trade_date,
                final_score=85,
                rating="strong_buy",
                action="buy",
                current_price=100,
                entry_price=100,
                stop_loss_price=92,
                take_profit_1=108,
                take_profit_2=115,
                expected_return_percent=8,
                max_loss_percent=8,
                risk_reward_ratio=1,
                strategy_type=strategy_type,
                reason="Backtest seed",
            )
        )
        db.commit()
    finally:
        db.close()


def seed_factor(asset_id: int, trade_date: date, factor_name: str, factor_score: float):
    db = SessionLocal()
    try:
        db.add(
            FactorScore(
                asset_id=asset_id,
                trade_date=trade_date,
                factor_name=factor_name,
                factor_type="technical",
                factor_value=factor_score,
                factor_score=factor_score,
            )
        )
        db.commit()
    finally:
        db.close()


def test_backtesting_strategy_and_factor_flow():
    suffix = uuid4().hex[:10].upper()
    strategy_type = f"phase13_strategy_{suffix}"
    run_name = f"Phase13 Backtest {suffix}"
    factor_prefix = f"phase13_factor_{suffix}"
    strong_factor = f"{factor_prefix}_strong"
    weak_factor = f"{factor_prefix}_weak"
    symbol_a = f"BTA{suffix}"
    symbol_b = f"BTB{suffix}"
    symbol_c = f"BTC{suffix}"
    start_date = date(2099, 1, 1) + timedelta(days=int(suffix[:4], 16) % 300)
    end_date = start_date + timedelta(days=10)

    cleanup_backtests(run_name, factor_prefix)
    for symbol in (symbol_a, symbol_b, symbol_c):
        cleanup_asset(symbol)

    try:
        asset_a = seed_asset(symbol_a)
        asset_b = seed_asset(symbol_b)
        asset_c = seed_asset(symbol_c)
        seed_prices(asset_a, start_date, [100, 102, 104, 106, 108, 110, 112])
        seed_prices(asset_b, start_date, [100, 98, 96, 94, 92, 90, 88])
        seed_prices(asset_c, start_date, [100, 100, 100, 100, 100, 100, 100])
        seed_trade_plan(asset_a, start_date, strategy_type)
        seed_trade_plan(asset_b, start_date, strategy_type)

        strategy_response = client.post(
            "/backtests/strategy",
            json={
                "name": run_name,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "market": "US",
                "strategy_type": strategy_type,
                "initial_capital": 10000,
            },
        )
        strategy_run = strategy_response.json()

        assert strategy_response.status_code == 200
        assert strategy_run["total_trades"] == 2
        assert "total_return_percent" in strategy_run
        assert "win_rate" in strategy_run
        assert strategy_run["win_rate"] == 50

        trades_response = client.get(f"/backtests/{strategy_run['id']}/trades")
        trades = trades_response.json()

        assert trades_response.status_code == 200
        assert len(trades) == 2
        assert {trade["asset_id"] for trade in trades} == {asset_a, asset_b}

        seed_factor(asset_a, start_date, strong_factor, 75)
        seed_factor(asset_b, start_date, strong_factor, 60)
        seed_factor(asset_b, start_date, weak_factor, 80)
        seed_factor(asset_c, start_date, weak_factor, 85)

        strong_factor_response = client.post(
            "/backtests/factors",
            json={
                "factor_name": strong_factor,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "market": "US",
            },
        )
        strong_result = strong_factor_response.json()

        assert strong_factor_response.status_code == 200
        assert strong_result["total_signals"] == 1
        assert strong_result["avg_return_percent"] > 0

        weak_factor_response = client.post(
            "/backtests/factors",
            json={
                "factor_name": weak_factor,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "market": "US",
            },
        )
        weak_result = weak_factor_response.json()

        assert weak_factor_response.status_code == 200
        assert weak_result["total_signals"] == 2

        rank_response = client.post(
            "/backtests/factors/rank",
            json={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "market": "US",
            },
        )
        rankings = [
            item
            for item in rank_response.json()
            if item["factor_name"] in {strong_factor, weak_factor}
        ]

        assert rank_response.status_code == 200
        assert len(rankings) == 2
        assert [item["factor_rank"] for item in rankings] == [1, 2]
        assert rankings[0]["profit_factor"] >= rankings[1]["profit_factor"]

        results_response = client.get("/backtests/factors/results")
        relevant_results = [
            item
            for item in results_response.json()
            if item["factor_name"] in {strong_factor, weak_factor}
        ]

        assert results_response.status_code == 200
        assert len(relevant_results) == 2
    finally:
        cleanup_backtests(run_name, factor_prefix)
        for symbol in (symbol_a, symbol_b, symbol_c):
            cleanup_asset(symbol)
