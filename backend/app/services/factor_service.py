from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.factor import FactorScore
from app.models.indicator import TechnicalIndicator
from app.schemas.indicators import FactorScoreCreate
from app.services.indicator_service import get_asset_or_404


def to_decimal(value: float | int) -> Decimal:
    return Decimal(str(round(float(value), 4)))


def create_or_update_factor_score(
    db: Session,
    asset_id: int,
    factor_create: FactorScoreCreate,
) -> FactorScore:
    get_asset_or_404(db, asset_id)
    factor = (
        db.query(FactorScore)
        .filter(
            FactorScore.asset_id == asset_id,
            FactorScore.trade_date == factor_create.trade_date,
            FactorScore.factor_name == factor_create.factor_name,
        )
        .first()
    )

    data = factor_create.model_dump()
    if factor:
        for field, value in data.items():
            setattr(factor, field, value)
    else:
        factor = FactorScore(asset_id=asset_id, **data)
        db.add(factor)

    db.commit()
    db.refresh(factor)
    return factor


def list_factor_scores(db: Session, asset_id: int, trade_date=None) -> list[FactorScore]:
    get_asset_or_404(db, asset_id)
    query = db.query(FactorScore).filter(FactorScore.asset_id == asset_id)
    if trade_date is not None:
        query = query.filter(FactorScore.trade_date == trade_date)
    return query.order_by(FactorScore.trade_date.asc(), FactorScore.factor_name.asc()).all()


def rsi_score(rsi14) -> int:
    if rsi14 is None:
        return 50
    rsi = float(rsi14)
    if 40 <= rsi <= 70:
        return 80
    if rsi > 70:
        return 40
    if rsi < 30:
        return 60
    return 50


def volume_score(volume_ratio) -> int:
    if volume_ratio is None:
        return 50
    ratio = float(volume_ratio)
    if ratio >= 2:
        return 85
    if ratio >= 1.2:
        return 70
    return 50


def change_score(change_percent) -> int:
    if change_percent is None:
        return 40
    return 70 if float(change_percent) > 0 else 40


def generate_basic_factor_scores(db: Session, asset_id: int) -> list[FactorScore]:
    get_asset_or_404(db, asset_id)
    indicators = (
        db.query(TechnicalIndicator)
        .filter(TechnicalIndicator.asset_id == asset_id)
        .order_by(TechnicalIndicator.trade_date.asc())
        .all()
    )
    existing_factors = {
        (factor.trade_date, factor.factor_name): factor
        for factor in db.query(FactorScore).filter(FactorScore.asset_id == asset_id).all()
    }
    factors: list[FactorScore] = []

    for indicator in indicators:
        factor_payloads = [
            FactorScoreCreate(
                trade_date=indicator.trade_date,
                factor_name="uptrend_score",
                factor_type="technical",
                factor_value=1 if indicator.is_uptrend else 0,
                factor_score=80 if indicator.is_uptrend else 40,
            ),
            FactorScoreCreate(
                trade_date=indicator.trade_date,
                factor_name="rsi_score",
                factor_type="technical",
                factor_value=float(indicator.rsi14) if indicator.rsi14 is not None else 0,
                factor_score=rsi_score(indicator.rsi14),
            ),
            FactorScoreCreate(
                trade_date=indicator.trade_date,
                factor_name="volume_score",
                factor_type="technical",
                factor_value=float(indicator.volume_ratio)
                if indicator.volume_ratio is not None
                else 0,
                factor_score=volume_score(indicator.volume_ratio),
            ),
            FactorScoreCreate(
                trade_date=indicator.trade_date,
                factor_name="change_score",
                factor_type="technical",
                factor_value=float(indicator.change_percent)
                if indicator.change_percent is not None
                else 0,
                factor_score=change_score(indicator.change_percent),
            ),
        ]
        for payload in factor_payloads:
            key = (payload.trade_date, payload.factor_name)
            factor = existing_factors.get(key)
            data = payload.model_dump()
            if factor:
                for field, value in data.items():
                    setattr(factor, field, value)
            else:
                factor = FactorScore(asset_id=asset_id, **data)
                db.add(factor)
            factors.append(factor)

    db.commit()
    for factor in factors:
        db.refresh(factor)
    return factors
