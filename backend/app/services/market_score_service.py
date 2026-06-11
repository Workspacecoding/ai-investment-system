"""
市場分數計算服務
MarketScore = Σ(indicator_score_i × weight_i / 100)
狀態：>=80 強勢, 60-79 偏多, 40-59 中性, 20-39 偏弱, <20 弱勢
"""
from datetime import date, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.indicator_daily_value import IndicatorDailyValue
from app.models.market_score_snapshot import MarketScoreSnapshot
from app.models.score_formula import ScoreFormula

HIT_THRESHOLD = 80.0  # score >= 80 predicts 20d positive return


def _score_to_status(score: float) -> str:
    if score >= 80:
        return "強勢"
    if score >= 60:
        return "偏多"
    if score >= 40:
        return "中性"
    if score >= 20:
        return "偏弱"
    return "弱勢"


def get_formula_items(db: Session, market_code: str) -> list[ScoreFormula]:
    """Return active formula items for a market. Falls back to global (market_code=NULL)."""
    rows = (
        db.query(ScoreFormula)
        .filter(
            ScoreFormula.formula_type == "market_score",
            ScoreFormula.market_code == market_code,
            ScoreFormula.is_active.is_(True),
            ScoreFormula.use_in_calc.is_(True),
        )
        .order_by(ScoreFormula.display_order)
        .all()
    )
    if not rows:
        rows = (
            db.query(ScoreFormula)
            .filter(
                ScoreFormula.formula_type == "market_score",
                ScoreFormula.market_code.is_(None),
                ScoreFormula.is_active.is_(True),
                ScoreFormula.use_in_calc.is_(True),
            )
            .order_by(ScoreFormula.display_order)
            .all()
        )
    return rows


def calculate_market_score(
    db: Session,
    market_code: str,
    indicator_values: dict[str, float],  # {field_key: score 0-100}
) -> dict[str, Any]:
    """Calculate MarketScore from indicator values and formula weights."""
    formulas = get_formula_items(db, market_code)
    total_weight = sum(f.weight for f in formulas)

    score = 0.0
    breakdown = []
    for f in formulas:
        ind_score = indicator_values.get(f.field_key, 50.0)
        effective_score = (100.0 - ind_score) if f.is_reverse else ind_score
        contribution = effective_score * (f.weight / 100.0)
        score += contribution
        breakdown.append({
            "field_key": f.field_key,
            "display_name": f.display_name,
            "score": round(effective_score, 1),
            "raw_score": round(ind_score, 1),
            "weight": f.weight,
            "contribution": round(contribution, 2),
            "is_reverse": f.is_reverse,
        })

    # Normalise if weights don't sum to 100
    if total_weight > 0 and abs(total_weight - 100) > 5:
        score = score * (100.0 / total_weight)

    score = round(max(0.0, min(100.0, score)), 1)
    status = _score_to_status(score)
    return {"score": score, "status": status, "breakdown": breakdown, "total_weight": round(total_weight, 1)}


# ── Indicator daily values ───────────────────────────────────────────────────

def get_indicator_values(db: Session, market_code: str, record_date: date | None = None) -> list[IndicatorDailyValue]:
    q = db.query(IndicatorDailyValue).filter(IndicatorDailyValue.market_code == market_code)
    if record_date:
        q = q.filter(IndicatorDailyValue.record_date == record_date)
    else:
        # Latest date
        latest = (
            db.query(func.max(IndicatorDailyValue.record_date))
            .filter(IndicatorDailyValue.market_code == market_code)
            .scalar()
        )
        if latest:
            q = q.filter(IndicatorDailyValue.record_date == latest)
        else:
            return []
    return q.order_by(IndicatorDailyValue.field_key).all()


def upsert_indicator_values(
    db: Session,
    market_code: str,
    record_date: date,
    entries: list[dict],  # [{field_key, display_name, score, raw_value?, notes?}]
) -> list[IndicatorDailyValue]:
    result = []
    for e in entries:
        row = (
            db.query(IndicatorDailyValue)
            .filter(
                IndicatorDailyValue.record_date == record_date,
                IndicatorDailyValue.market_code == market_code,
                IndicatorDailyValue.field_key == e["field_key"],
            )
            .first()
        )
        if row:
            row.score = e["score"]
            row.raw_value = e.get("raw_value")
            row.notes = e.get("notes")
            row.display_name = e.get("display_name", row.display_name)
        else:
            row = IndicatorDailyValue(
                record_date=record_date,
                market_code=market_code,
                field_key=e["field_key"],
                display_name=e.get("display_name", e["field_key"]),
                score=e["score"],
                raw_value=e.get("raw_value"),
                notes=e.get("notes"),
            )
            db.add(row)
        result.append(row)
    db.commit()
    for r in result:
        db.refresh(r)
    return result


# ── Market score snapshots ───────────────────────────────────────────────────

def save_snapshot(
    db: Session,
    market_code: str,
    record_date: date,
    score: float,
    status: str,
    breakdown: list[dict],
    formula_version: str = "v1.0",
) -> MarketScoreSnapshot:
    row = (
        db.query(MarketScoreSnapshot)
        .filter(
            MarketScoreSnapshot.record_date == record_date,
            MarketScoreSnapshot.market_code == market_code,
        )
        .first()
    )
    if row:
        row.score = score
        row.status = status
        row.breakdown = breakdown
        row.formula_version = formula_version
    else:
        row = MarketScoreSnapshot(
            record_date=record_date,
            market_code=market_code,
            score=score,
            status=status,
            breakdown=breakdown,
            formula_version=formula_version,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_snapshots(db: Session, market_code: str, limit: int = 90) -> list[MarketScoreSnapshot]:
    return (
        db.query(MarketScoreSnapshot)
        .filter(MarketScoreSnapshot.market_code == market_code)
        .order_by(MarketScoreSnapshot.record_date.desc())
        .limit(limit)
        .all()
    )


def update_snapshot_returns(
    db: Session,
    snapshot_id: int,
    future_5d: float | None = None,
    future_10d: float | None = None,
    future_20d: float | None = None,
) -> MarketScoreSnapshot:
    row = db.query(MarketScoreSnapshot).filter(MarketScoreSnapshot.id == snapshot_id).first()
    if not row:
        raise ValueError(f"Snapshot {snapshot_id} not found")
    if future_5d is not None:
        row.future_return_5d = future_5d
    if future_10d is not None:
        row.future_return_10d = future_10d
    if future_20d is not None:
        row.future_return_20d = future_20d
        row.is_hit = (row.score >= HIT_THRESHOLD and future_20d > 0) or (row.score < HIT_THRESHOLD and future_20d <= 0)
    db.commit()
    db.refresh(row)
    return row


def get_validation_stats(db: Session, market_code: str) -> dict:
    snapshots = (
        db.query(MarketScoreSnapshot)
        .filter(
            MarketScoreSnapshot.market_code == market_code,
            MarketScoreSnapshot.future_return_20d.isnot(None),
        )
        .all()
    )
    total = len(snapshots)
    if total == 0:
        return {"total": 0, "hit_count": 0, "hit_rate": 0.0, "avg_error": None, "max_error": None, "correlation": None}

    hits = [s for s in snapshots if s.is_hit]
    errors = [abs(s.score - (50.0 + s.future_return_20d * 100)) for s in snapshots]

    # Simple correlation: score vs future_return_20d
    scores = [s.score for s in snapshots]
    returns = [s.future_return_20d for s in snapshots]
    n = len(scores)
    mean_s = sum(scores) / n
    mean_r = sum(returns) / n
    cov = sum((scores[i] - mean_s) * (returns[i] - mean_r) for i in range(n)) / n
    std_s = (sum((s - mean_s) ** 2 for s in scores) / n) ** 0.5
    std_r = (sum((r - mean_r) ** 2 for r in returns) / n) ** 0.5
    corr = round(cov / (std_s * std_r), 3) if std_s > 0 and std_r > 0 else None

    return {
        "total": total,
        "hit_count": len(hits),
        "hit_rate": round(len(hits) / total * 100, 1),
        "avg_error": round(sum(errors) / len(errors), 2) if errors else None,
        "max_error": round(max(errors), 2) if errors else None,
        "correlation": corr,
    }
