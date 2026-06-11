from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AssetRoleLink(Base):
    __tablename__ = "asset_role_links"
    __table_args__ = (UniqueConstraint("asset_id", "role_id", name="uq_asset_role_link"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.id"), nullable=False)
    role_id = Column(BigInteger, ForeignKey("asset_roles.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
