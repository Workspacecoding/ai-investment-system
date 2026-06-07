from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.industry import Industry, IndustryMomentum
from app.models.news import IndustrySentimentSnapshot
from app.schemas.industry import IndustryCreate, IndustryMomentumCreate


def normalize_sentiment_score(industry_news_score: float) -> float:
    return min(max(industry_news_score + 50, 0), 100)


def get_latest_normalized_sentiment_score(
    db: Session,
    industry_id: int,
    snapshot_date,
) -> float | None:
    snapshot = (
        db.query(IndustrySentimentSnapshot)
        .filter(
            IndustrySentimentSnapshot.industry_id == industry_id,
            IndustrySentimentSnapshot.snapshot_date <= snapshot_date,
        )
        .order_by(
            IndustrySentimentSnapshot.snapshot_date.desc(),
            IndustrySentimentSnapshot.id.desc(),
        )
        .first()
    )
    if not snapshot:
        return None
    return normalize_sentiment_score(float(snapshot.industry_news_score))


def calculate_momentum_score(
    momentum: IndustryMomentumCreate,
    sentiment_score: float | None = None,
) -> float:
    if sentiment_score is not None:
        return (
            (momentum.avg_return_1m * 0.25)
            + (momentum.avg_return_3m * 0.25)
            + (momentum.avg_return_6m * 0.2)
            + (momentum.volume_score * 0.1)
            + (momentum.trend_score * 0.1)
            + (sentiment_score * 0.1)
        )
    return (
        (momentum.avg_return_1m * 0.3)
        + (momentum.avg_return_3m * 0.3)
        + (momentum.avg_return_6m * 0.2)
        + (momentum.volume_score * 0.1)
        + (momentum.trend_score * 0.1)
    )


def create_industry(db: Session, industry_create: IndustryCreate) -> Industry:
    existing_industry = (
        db.query(Industry)
        .filter(Industry.industry_code == industry_create.industry_code)
        .first()
    )
    if existing_industry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Industry code already exists",
        )

    industry = Industry(**industry_create.model_dump())
    db.add(industry)
    db.commit()
    db.refresh(industry)
    return industry


def list_industries(db: Session) -> list[Industry]:
    return db.query(Industry).order_by(Industry.industry_code.asc()).all()


def get_industry_or_404(db: Session, industry_id: int) -> Industry:
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Industry not found",
        )
    return industry


def upsert_industry_momentum(
    db: Session,
    industry_id: int,
    momentum_create: IndustryMomentumCreate,
) -> IndustryMomentum:
    get_industry_or_404(db, industry_id)
    sentiment_score = get_latest_normalized_sentiment_score(
        db,
        industry_id,
        momentum_create.snapshot_date,
    )
    momentum_score = calculate_momentum_score(momentum_create, sentiment_score)
    momentum_version = "v2" if sentiment_score is not None else "v1"
    momentum = (
        db.query(IndustryMomentum)
        .filter(
            IndustryMomentum.industry_id == industry_id,
            IndustryMomentum.snapshot_date == momentum_create.snapshot_date,
        )
        .first()
    )

    data = momentum_create.model_dump(exclude={"sentiment_score"})
    data["sentiment_score"] = sentiment_score
    data["momentum_version"] = momentum_version
    if momentum:
        for field, value in data.items():
            setattr(momentum, field, value)
        momentum.momentum_score = momentum_score
    else:
        momentum = IndustryMomentum(
            industry_id=industry_id,
            **data,
            momentum_score=momentum_score,
        )
        db.add(momentum)

    db.commit()
    db.refresh(momentum)
    recalculate_ranking(db, momentum.snapshot_date)
    db.refresh(momentum)
    return momentum


def get_latest_momentum(db: Session) -> list[IndustryMomentum]:
    latest_date = db.query(func.max(IndustryMomentum.snapshot_date)).scalar()
    if latest_date is None:
        return []
    return (
        db.query(IndustryMomentum)
        .filter(IndustryMomentum.snapshot_date == latest_date)
        .order_by(IndustryMomentum.ranking.asc(), IndustryMomentum.momentum_score.desc())
        .all()
    )


def get_momentum_ranking(db: Session) -> list[IndustryMomentum]:
    return (
        db.query(IndustryMomentum)
        .order_by(
            IndustryMomentum.snapshot_date.desc(),
            IndustryMomentum.ranking.asc(),
            IndustryMomentum.momentum_score.desc(),
        )
        .all()
    )


def recalculate_ranking(
    db: Session,
    snapshot_date=None,
) -> list[IndustryMomentum]:
    query = db.query(IndustryMomentum)
    if snapshot_date is not None:
        query = query.filter(IndustryMomentum.snapshot_date == snapshot_date)

    momentum_rows = query.order_by(
        IndustryMomentum.snapshot_date.desc(),
        IndustryMomentum.momentum_score.desc(),
        IndustryMomentum.id.asc(),
    ).all()

    current_date = None
    ranking = 0
    for momentum in momentum_rows:
        if momentum.snapshot_date != current_date:
            current_date = momentum.snapshot_date
            ranking = 1
        else:
            ranking += 1
        momentum.ranking = ranking

    db.commit()
    for momentum in momentum_rows:
        db.refresh(momentum)
    return momentum_rows
