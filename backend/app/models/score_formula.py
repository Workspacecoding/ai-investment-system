from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class ScoreFormula(Base):
    """Defines indicator weights for different scoring formulas (market score, stock categories)."""
    __tablename__ = "score_formulas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    # "market_score" | "tw_stock" | "us_stock" | "penny_stock" | "crypto"
    formula_type = Column(String(30), nullable=False)
    # NULL = global fallback; "TW"/"US"/"HK" = market-specific formula
    market_code = Column(String(20), nullable=True)
    field_key = Column(String(80), nullable=False)    # indicator key or custom factor key
    display_name = Column(String(100), nullable=False)
    weight = Column(Float, nullable=False, default=0.0)      # weight in %
    is_active = Column(Boolean, nullable=False, default=True)
    use_in_calc = Column(Boolean, nullable=False, default=True)
    is_reverse = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)
    formula_expr = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
