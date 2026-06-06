from sqlalchemy.orm import Session

from app.models.market import MarketSnapshot
from app.schemas.market import MarketSnapshotCreate


def calculate_market_score(snapshot: MarketSnapshotCreate) -> tuple[int, str]:
    score = 50

    score += 10 if snapshot.nasdaq_change_percent > 0 else -10
    score += 10 if snapshot.sp500_change_percent > 0 else -10
    score += 10 if snapshot.twii_change_percent > 0 else -10
    score += 10 if snapshot.vix_value < 20 else -10
    score += 10 if snapshot.us10y_value < 5 else -10

    score = max(0, min(100, score))

    if score >= 70:
        return score, "bull"
    if score >= 40:
        return score, "sideways"
    return score, "bear"


def upsert_market_snapshot(
    db: Session,
    snapshot_create: MarketSnapshotCreate,
) -> MarketSnapshot:
    score, regime = calculate_market_score(snapshot_create)
    snapshot = (
        db.query(MarketSnapshot)
        .filter(MarketSnapshot.snapshot_date == snapshot_create.snapshot_date)
        .first()
    )

    data = snapshot_create.model_dump()
    if snapshot:
        for field, value in data.items():
            setattr(snapshot, field, value)
        snapshot.market_score = score
        snapshot.market_regime = regime
    else:
        snapshot = MarketSnapshot(
            **data,
            market_score=score,
            market_regime=regime,
        )
        db.add(snapshot)

    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_latest_market_snapshot(db: Session) -> MarketSnapshot | None:
    return (
        db.query(MarketSnapshot)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .first()
    )


def list_market_snapshots(db: Session) -> list[MarketSnapshot]:
    return (
        db.query(MarketSnapshot)
        .order_by(MarketSnapshot.snapshot_date.desc(), MarketSnapshot.id.desc())
        .all()
    )
