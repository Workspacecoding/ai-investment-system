from sqlalchemy import BigInteger, Column, Date, DateTime, Float, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class UserGoal(Base):
    __tablename__ = "user_goals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    current_capital = Column(Float, nullable=False)
    target_capital = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
