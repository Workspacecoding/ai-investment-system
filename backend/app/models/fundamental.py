from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class FundamentalReport(Base):
    __tablename__ = "fundamental_reports"
    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            "report_year",
            "report_quarter",
            name="uq_fundamental_report_asset_period",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    report_year = Column(Integer, nullable=False)
    report_quarter = Column(Integer, nullable=False)
    revenue = Column(Numeric(20, 4), nullable=False)
    revenue_yoy_percent = Column(Numeric(10, 4), nullable=False)
    revenue_qoq_percent = Column(Numeric(10, 4), nullable=False)
    gross_profit = Column(Numeric(20, 4), nullable=False)
    operating_income = Column(Numeric(20, 4), nullable=False)
    net_income = Column(Numeric(20, 4), nullable=False)
    eps = Column(Numeric(10, 4), nullable=False)
    gross_margin = Column(Numeric(10, 4), nullable=False)
    operating_margin = Column(Numeric(10, 4), nullable=False)
    net_margin = Column(Numeric(10, 4), nullable=False)
    roe = Column(Numeric(10, 4), nullable=False)
    roa = Column(Numeric(10, 4), nullable=False)
    debt_ratio = Column(Numeric(10, 4), nullable=False)
    current_ratio = Column(Numeric(10, 4), nullable=False)
    operating_cash_flow = Column(Numeric(20, 4), nullable=False)
    free_cash_flow = Column(Numeric(20, 4), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class FundamentalScore(Base):
    __tablename__ = "fundamental_scores"
    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            "report_year",
            "report_quarter",
            name="uq_fundamental_score_asset_period",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    report_year = Column(Integer, nullable=False)
    report_quarter = Column(Integer, nullable=False)
    growth_score = Column(Numeric(10, 4), nullable=False)
    profitability_score = Column(Numeric(10, 4), nullable=False)
    financial_health_score = Column(Numeric(10, 4), nullable=False)
    cashflow_score = Column(Numeric(10, 4), nullable=False)
    fundamental_score = Column(Numeric(10, 4), nullable=False)
    fundamental_rating = Column(
        Enum("excellent", "good", "normal", "weak", "poor"),
        nullable=False,
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
