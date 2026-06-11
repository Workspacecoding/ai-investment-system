from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.api_config import ApiConfig
from app.models.asset import Asset
from app.models.asset_indicator import AssetIndicatorLink
from app.models.asset_role import AssetRole
from app.models.asset_role_link import AssetRoleLink
from app.models.asset_type_config import AssetTypeConfig
from app.models.factor_corr_report import FactorCorrReport, StockCorrEntry
from app.models.industry import Industry, IndustryMomentum
from app.models.industry_indicator_link import IndustryIndicatorLink
from app.models.market_config import MarketConfig
from app.models.market_config_indicator_link import MarketConfigIndicatorLink
from app.models.market_indicator_config import MarketIndicatorConfig, TrackedIndustry
from app.models.role_config import RoleConfig
from app.models.score_formula import ScoreFormula
from app.models.user import User
from app.schemas.api_config import ApiConfigCreate, ApiConfigUpdate
from app.schemas.market_indicator import (
    MarketIndicatorConfigCreate,
    MarketIndicatorConfigUpdate,
)
from app.schemas.admin import (
    AssetBulkItem,
    AssetIndicatorLinkItem,
    AssetRoleCreate,
    AssetRoleUpdate,
    AssetTypeConfigCreate,
    AssetTypeConfigUpdate,
    AssetUpdate,
    BulkImportResponse,
    FactorCorrReportCreate,
    FactorCorrReportUpdate,
    IndustryUpdate,
    MarketConfigCreate,
    MarketConfigUpdate,
    RoleConfigCreate,
    RoleConfigUpdate,
    ScoreFormulaCreate,
    ScoreFormulaUpdate,
    StockCorrEntryCreate,
    StockCorrEntryUpdate,
    SymbolLookupResponse,
    UserAdminCreate,
    UserAdminUpdate,
)


# ── MarketConfig ─────────────────────────────────────────────────────────────

def list_market_configs(db: Session) -> list[MarketConfig]:
    return db.query(MarketConfig).order_by(MarketConfig.display_order.asc(), MarketConfig.code.asc()).all()


def reorder_market(db: Session, market_id: int, direction: str) -> list[MarketConfig]:
    markets = list_market_configs(db)
    idx = next((i for i, m in enumerate(markets) if m.id == market_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Market not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(markets):
        return markets  # already at boundary
    a, b = markets[idx], markets[swap_idx]
    a.display_order, b.display_order = b.display_order, a.display_order
    if a.display_order == b.display_order:
        a.display_order = idx
        b.display_order = swap_idx
    db.commit()
    return list_market_configs(db)


def create_market_config(db: Session, payload: MarketConfigCreate) -> MarketConfig:
    existing = db.query(MarketConfig).filter(MarketConfig.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Market '{payload.code}' already exists")
    data = payload.model_dump()
    data["code"] = payload.code.upper()
    mc = MarketConfig(**data)
    db.add(mc)
    db.commit()
    db.refresh(mc)
    return mc


def update_market_config(db: Session, market_id: int, payload: MarketConfigUpdate) -> MarketConfig:
    mc = db.query(MarketConfig).filter(MarketConfig.id == market_id).first()
    if not mc:
        raise HTTPException(status_code=404, detail="Market not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(mc, field, value)
    db.commit()
    db.refresh(mc)
    return mc


def delete_market_config(db: Session, market_id: int) -> None:
    mc = db.query(MarketConfig).filter(MarketConfig.id == market_id).first()
    if not mc:
        raise HTTPException(status_code=404, detail="Market not found")
    db.delete(mc)
    db.commit()


# ── Asset admin ──────────────────────────────────────────────────────────────

def list_assets_admin(
    db: Session,
    search: str | None = None,
    market: str | None = None,
    asset_type: str | None = None,
    industry_id: int | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[Asset], int]:
    query = db.query(Asset)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Asset.symbol.ilike(like) | Asset.name.ilike(like)
        )
    if market:
        query = query.filter(Asset.market == market)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if industry_id is not None:
        query = query.filter(Asset.industry_id == industry_id)
    if is_active is not None:
        query = query.filter(Asset.is_active == is_active)
    total = query.count()
    items = query.order_by(Asset.market.asc(), Asset.symbol.asc()).offset(skip).limit(limit).all()
    return items, total


def update_asset(db: Session, asset_id: int, payload: AssetUpdate) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset_id: int) -> None:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.is_active = False
    db.commit()


def bulk_import_assets(db: Session, items: list[AssetBulkItem]) -> BulkImportResponse:
    created = 0
    skipped = 0
    errors: list[str] = []
    for item in items:
        try:
            existing = db.query(Asset).filter(
                Asset.symbol == item.symbol, Asset.market == item.market
            ).first()
            if existing:
                skipped += 1
                continue
            asset = Asset(**item.model_dump())
            db.add(asset)
            db.flush()
            created += 1
        except Exception as exc:
            errors.append(f"{item.symbol}: {exc}")
    db.commit()
    return BulkImportResponse(created=created, skipped=skipped, errors=errors)


# ── Industry admin ────────────────────────────────────────────────────────────

def update_industry(db: Session, industry_id: int, payload: IndustryUpdate) -> Industry:
    ind = db.query(Industry).filter(Industry.id == industry_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Industry not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ind, field, value)
    db.commit()
    db.refresh(ind)
    return ind


def delete_industry(db: Session, industry_id: int) -> None:
    ind = db.query(Industry).filter(Industry.id == industry_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Industry not found")
    in_use = db.query(Asset).filter(Asset.industry_id == industry_id).count()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"Industry is referenced by {in_use} asset(s); unlink them first",
        )
    db.delete(ind)
    db.commit()


def get_market_config_indicators(db: Session, market_config_id: int) -> list[dict]:
    rows = (
        db.query(MarketConfigIndicatorLink, MarketIndicatorConfig)
        .join(MarketIndicatorConfig, MarketIndicatorConfig.id == MarketConfigIndicatorLink.indicator_config_id)
        .filter(MarketConfigIndicatorLink.market_config_id == market_config_id)
        .all()
    )
    return [
        {"id": link.id, "indicator_config_id": cfg.id, "field_key": cfg.field_key, "display_name": cfg.display_name}
        for link, cfg in rows
    ]


def set_market_config_indicators(db: Session, market_config_id: int, indicator_ids: list[int]) -> list[dict]:
    db.query(MarketConfigIndicatorLink).filter(MarketConfigIndicatorLink.market_config_id == market_config_id).delete()
    for ind_id in indicator_ids:
        db.add(MarketConfigIndicatorLink(market_config_id=market_config_id, indicator_config_id=ind_id))
    db.commit()
    return get_market_config_indicators(db, market_config_id)


def get_industry_indicators(db: Session, industry_id: int) -> list[dict]:
    rows = (
        db.query(IndustryIndicatorLink, MarketIndicatorConfig)
        .join(MarketIndicatorConfig, MarketIndicatorConfig.id == IndustryIndicatorLink.indicator_config_id)
        .filter(IndustryIndicatorLink.industry_id == industry_id)
        .all()
    )
    return [
        {"id": link.id, "indicator_config_id": cfg.id, "field_key": cfg.field_key, "display_name": cfg.display_name}
        for link, cfg in rows
    ]


def set_industry_indicators(db: Session, industry_id: int, indicator_ids: list[int]) -> list[dict]:
    db.query(IndustryIndicatorLink).filter(IndustryIndicatorLink.industry_id == industry_id).delete()
    for ind_id in indicator_ids:
        db.add(IndustryIndicatorLink(industry_id=industry_id, indicator_config_id=ind_id))
    db.commit()
    return get_industry_indicators(db, industry_id)


# ── Symbol lookup ─────────────────────────────────────────────────────────────

def _to_yf_symbol(symbol: str, market: str) -> str:
    market_upper = market.upper()
    if market_upper == "TW":
        return f"{symbol}.TW"
    if market_upper == "TWO":
        return f"{symbol}.TWO"
    return symbol


def lookup_symbol(symbol: str, market: str) -> SymbolLookupResponse:
    import yfinance as yf

    yf_sym = _to_yf_symbol(symbol.strip().upper(), market)
    try:
        ticker = yf.Ticker(yf_sym)
        info = ticker.info or {}
        short_name = info.get("shortName") or info.get("longName") or None
        long_name = info.get("longName") or None
        currency = info.get("currency") or None
        quote_type = info.get("quoteType") or None
        asset_type_map = {
            "EQUITY": "stock",
            "ETF": "etf",
            "CRYPTOCURRENCY": "crypto",
        }
        asset_type = asset_type_map.get((quote_type or "").upper())
        found = bool(short_name or long_name)
    except Exception:
        short_name = None
        long_name = None
        currency = None
        asset_type = None
        found = False

    return SymbolLookupResponse(
        symbol=symbol.strip().upper(),
        name=short_name,
        long_name=long_name,
        market=market,
        asset_type=asset_type,
        currency=currency,
        found=found,
    )


# ── Market Indicator Configs ──────────────────────────────────────────────────

_DEFAULT_INDICATORS = [
    {
        "field_key": "twii_change_percent",
        "display_name": "加權指數漲跌幅",
        "unit": "%",
        "description": "台灣加權股價指數相對前日收盤的漲跌百分比。",
        "formula": "TWII今日收盤 / TWII前日收盤 - 1，以百分比表示。",
        "display_order": 1,
    },
    {
        "field_key": "nasdaq_change_percent",
        "display_name": "NASDAQ漲跌幅",
        "unit": "%",
        "description": "美國NASDAQ綜合指數漲跌幅，反映科技股整體表現。",
        "formula": "NASDAQ今日收盤 / NASDAQ前日收盤 - 1，以百分比表示。",
        "display_order": 2,
    },
    {
        "field_key": "sp500_change_percent",
        "display_name": "S&P500漲跌幅",
        "unit": "%",
        "description": "美國S&P500指數漲跌幅，反映美股大盤整體動向。",
        "formula": "SP500今日收盤 / SP500前日收盤 - 1，以百分比表示。",
        "display_order": 3,
    },
    {
        "field_key": "vix_value",
        "display_name": "VIX恐慌指數",
        "unit": "點",
        "description": "CBOE波動率指數，>30代表市場恐慌，<15代表市場平靜。",
        "formula": "由CBOE根據S&P500選擇權隱含波動率計算，30天預期年化波動。",
        "display_order": 4,
    },
    {
        "field_key": "us10y_value",
        "display_name": "美債10年殖利率",
        "unit": "%",
        "description": "美國10年期公債殖利率，影響資金成本與股市估值。",
        "formula": "由美國財政部公布的10年期公債市場殖利率。",
        "display_order": 5,
    },
    {
        "field_key": "market_score",
        "display_name": "市場綜合分數",
        "unit": "分",
        "description": "整合大盤漲跌、VIX、殖利率等指標計算出的綜合市場健康分數。",
        "formula": "各指標正規化後加權平均：大盤40% + 美股30% + VIX20% + 殖利率10%。",
        "display_order": 6,
    },
]


def seed_default_indicators(db: Session) -> None:
    for item in _DEFAULT_INDICATORS:
        existing = db.query(MarketIndicatorConfig).filter(
            MarketIndicatorConfig.field_key == item["field_key"]
        ).first()
        if not existing:
            db.add(MarketIndicatorConfig(**item))
    db.commit()


def list_indicator_configs(db: Session) -> list[MarketIndicatorConfig]:
    return (
        db.query(MarketIndicatorConfig)
        .order_by(MarketIndicatorConfig.display_order.asc(), MarketIndicatorConfig.id.asc())
        .all()
    )


def create_indicator_config(db: Session, payload: MarketIndicatorConfigCreate) -> MarketIndicatorConfig:
    existing = db.query(MarketIndicatorConfig).filter(
        MarketIndicatorConfig.field_key == payload.field_key
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Indicator '{payload.field_key}' already exists")
    cfg = MarketIndicatorConfig(**payload.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def update_indicator_config(db: Session, cfg_id: int, payload: MarketIndicatorConfigUpdate) -> MarketIndicatorConfig:
    cfg = db.query(MarketIndicatorConfig).filter(MarketIndicatorConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Indicator config not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


def delete_indicator_config(db: Session, cfg_id: int) -> None:
    cfg = db.query(MarketIndicatorConfig).filter(MarketIndicatorConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Indicator config not found")
    db.delete(cfg)
    db.commit()


# ── Tracked Industries ────────────────────────────────────────────────────────

def list_tracked_industries(db: Session) -> list[dict]:
    rows = (
        db.query(TrackedIndustry, Industry)
        .join(Industry, Industry.id == TrackedIndustry.industry_id)
        .all()
    )
    result = []
    for ti, ind in rows:
        result.append({
            "id": ti.id,
            "industry_id": ti.industry_id,
            "industry_name": ind.industry_name,
            "industry_code": ind.industry_code,
            "market": ind.market,
            "created_at": ti.created_at,
        })
    return result


def add_tracked_industry(db: Session, industry_id: int) -> dict:
    ind = db.query(Industry).filter(Industry.id == industry_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Industry not found")
    existing = db.query(TrackedIndustry).filter(TrackedIndustry.industry_id == industry_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Industry already tracked")
    ti = TrackedIndustry(industry_id=industry_id)
    db.add(ti)
    db.commit()
    db.refresh(ti)
    return {
        "id": ti.id,
        "industry_id": ti.industry_id,
        "industry_name": ind.industry_name,
        "industry_code": ind.industry_code,
        "market": ind.market,
        "created_at": ti.created_at,
    }


def remove_tracked_industry(db: Session, tracked_id: int) -> None:
    ti = db.query(TrackedIndustry).filter(TrackedIndustry.id == tracked_id).first()
    if not ti:
        raise HTTPException(status_code=404, detail="Tracked industry not found")
    db.delete(ti)
    db.commit()


# ── API Configs ───────────────────────────────────────────────────────────────

def list_api_configs(db: Session) -> list[ApiConfig]:
    return db.query(ApiConfig).order_by(ApiConfig.code.asc()).all()


def create_api_config(db: Session, payload: ApiConfigCreate) -> ApiConfig:
    existing = db.query(ApiConfig).filter(ApiConfig.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"API config '{payload.code}' already exists")
    cfg = ApiConfig(**payload.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def update_api_config(db: Session, cfg_id: int, payload: ApiConfigUpdate) -> ApiConfig:
    cfg = db.query(ApiConfig).filter(ApiConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="API config not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


def delete_api_config(db: Session, cfg_id: int) -> None:
    cfg = db.query(ApiConfig).filter(ApiConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="API config not found")
    db.delete(cfg)
    db.commit()


# ── User Admin ────────────────────────────────────────────────────────────────

def list_users_admin(db: Session) -> list[User]:
    return db.query(User).order_by(User.created_at.asc()).all()


def create_user_admin(db: Session, payload: UserAdminCreate) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        name=payload.name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_admin(db: Session, user_id: int, payload: UserAdminUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.name is not None:
        user.name = payload.name
    if payload.new_password:
        if len(payload.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    db.refresh(user)
    return user


def delete_user_admin(db: Session, user_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ── Asset Indicator Links ─────────────────────────────────────────────────────

def get_asset_indicators(db: Session, asset_id: int) -> list[dict]:
    rows = (
        db.query(AssetIndicatorLink, MarketIndicatorConfig)
        .join(MarketIndicatorConfig, MarketIndicatorConfig.id == AssetIndicatorLink.indicator_config_id)
        .filter(AssetIndicatorLink.asset_id == asset_id)
        .all()
    )
    return [
        {"id": link.id, "indicator_config_id": cfg.id, "field_key": cfg.field_key, "display_name": cfg.display_name}
        for link, cfg in rows
    ]


def set_asset_indicators(db: Session, asset_id: int, indicator_ids: list[int]) -> list[dict]:
    db.query(AssetIndicatorLink).filter(AssetIndicatorLink.asset_id == asset_id).delete()
    for ind_id in indicator_ids:
        db.add(AssetIndicatorLink(asset_id=asset_id, indicator_config_id=ind_id))
    db.commit()
    return get_asset_indicators(db, asset_id)


# ── Score Formulas ────────────────────────────────────────────────────────────

_DEFAULT_SCORE_FORMULAS = [
    # market_score formulas
    {"formula_type": "market_score", "field_key": "twii_change_percent", "display_name": "台灣加權漲跌幅", "weight": 40.0, "use_in_calc": True, "display_order": 1},
    {"formula_type": "market_score", "field_key": "nasdaq_change_percent", "display_name": "NASDAQ漲跌幅", "weight": 20.0, "use_in_calc": True, "display_order": 2},
    {"formula_type": "market_score", "field_key": "sp500_change_percent", "display_name": "S&P500漲跌幅", "weight": 10.0, "use_in_calc": True, "display_order": 3},
    {"formula_type": "market_score", "field_key": "vix_value", "display_name": "VIX恐慌指數（反向）", "weight": 20.0, "use_in_calc": True, "display_order": 4},
    {"formula_type": "market_score", "field_key": "us10y_value", "display_name": "美債殖利率（反向）", "weight": 10.0, "use_in_calc": True, "display_order": 5},
    # tw_stock formulas
    {"formula_type": "tw_stock", "field_key": "momentum_score", "display_name": "動能分數", "weight": 30.0, "use_in_calc": True, "display_order": 1},
    {"formula_type": "tw_stock", "field_key": "volume_ratio", "display_name": "量比", "weight": 20.0, "use_in_calc": True, "display_order": 2},
    {"formula_type": "tw_stock", "field_key": "eps_growth", "display_name": "EPS成長率", "weight": 20.0, "use_in_calc": True, "display_order": 3},
    {"formula_type": "tw_stock", "field_key": "pe_ratio", "display_name": "本益比（反向）", "weight": 15.0, "use_in_calc": True, "display_order": 4},
    {"formula_type": "tw_stock", "field_key": "rsi", "display_name": "RSI技術指標", "weight": 15.0, "use_in_calc": True, "display_order": 5},
    # us_stock formulas
    {"formula_type": "us_stock", "field_key": "momentum_score", "display_name": "動能分數", "weight": 25.0, "use_in_calc": True, "display_order": 1},
    {"formula_type": "us_stock", "field_key": "revenue_growth", "display_name": "營收成長率", "weight": 25.0, "use_in_calc": True, "display_order": 2},
    {"formula_type": "us_stock", "field_key": "pe_ratio", "display_name": "本益比（反向）", "weight": 20.0, "use_in_calc": True, "display_order": 3},
    {"formula_type": "us_stock", "field_key": "rsi", "display_name": "RSI技術指標", "weight": 15.0, "use_in_calc": True, "display_order": 4},
    {"formula_type": "us_stock", "field_key": "market_cap", "display_name": "市值因子", "weight": 15.0, "use_in_calc": True, "display_order": 5},
    # penny_stock formulas
    {"formula_type": "penny_stock", "field_key": "volume_spike", "display_name": "爆量信號", "weight": 35.0, "use_in_calc": True, "display_order": 1},
    {"formula_type": "penny_stock", "field_key": "price_breakout", "display_name": "突破信號", "weight": 30.0, "use_in_calc": True, "display_order": 2},
    {"formula_type": "penny_stock", "field_key": "momentum_score", "display_name": "短線動能", "weight": 25.0, "use_in_calc": True, "display_order": 3},
    {"formula_type": "penny_stock", "field_key": "news_sentiment", "display_name": "消息面評分", "weight": 10.0, "use_in_calc": True, "display_order": 4},
    # crypto formulas
    {"formula_type": "crypto", "field_key": "btc_dominance", "display_name": "BTC主導率（反向）", "weight": 25.0, "use_in_calc": True, "display_order": 1},
    {"formula_type": "crypto", "field_key": "momentum_score", "display_name": "鏈上動能", "weight": 30.0, "use_in_calc": True, "display_order": 2},
    {"formula_type": "crypto", "field_key": "fear_greed", "display_name": "恐貪指數", "weight": 25.0, "use_in_calc": True, "display_order": 3},
    {"formula_type": "crypto", "field_key": "volume_ratio", "display_name": "成交量比", "weight": 20.0, "use_in_calc": True, "display_order": 4},
]


def seed_default_score_formulas(db: Session) -> None:
    for item in _DEFAULT_SCORE_FORMULAS:
        existing = db.query(ScoreFormula).filter(
            ScoreFormula.formula_type == item["formula_type"],
            ScoreFormula.field_key == item["field_key"],
        ).first()
        if not existing:
            db.add(ScoreFormula(**item))
    db.commit()


def list_score_formulas(db: Session, formula_type: str | None = None) -> list[ScoreFormula]:
    q = db.query(ScoreFormula)
    if formula_type:
        q = q.filter(ScoreFormula.formula_type == formula_type)
    return q.order_by(ScoreFormula.formula_type.asc(), ScoreFormula.display_order.asc()).all()


def create_score_formula(db: Session, payload: ScoreFormulaCreate) -> ScoreFormula:
    sf = ScoreFormula(**payload.model_dump())
    db.add(sf)
    db.commit()
    db.refresh(sf)
    return sf


def update_score_formula(db: Session, sf_id: int, payload: ScoreFormulaUpdate) -> ScoreFormula:
    sf = db.query(ScoreFormula).filter(ScoreFormula.id == sf_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="Score formula not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(sf, k, v)
    db.commit()
    db.refresh(sf)
    return sf


def delete_score_formula(db: Session, sf_id: int) -> None:
    sf = db.query(ScoreFormula).filter(ScoreFormula.id == sf_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="Score formula not found")
    db.delete(sf)
    db.commit()


# ── Asset Type Configs ────────────────────────────────────────────────────────

_DEFAULT_ASSET_TYPES = [
    {"code": "stock", "name": "股票", "display_order": 1},
    {"code": "etf", "name": "ETF / 基金", "display_order": 2},
    {"code": "crypto", "name": "加密貨幣", "display_order": 3},
    {"code": "penny_stock", "name": "雞蛋水餃股", "display_order": 4},
    {"code": "cash", "name": "現金", "display_order": 5},
    {"code": "insurance", "name": "保險", "display_order": 6},
]


def seed_default_asset_types(db: Session) -> None:
    for item in _DEFAULT_ASSET_TYPES:
        existing = db.query(AssetTypeConfig).filter(AssetTypeConfig.code == item["code"]).first()
        if not existing:
            db.add(AssetTypeConfig(**item))
    db.commit()


def list_asset_type_configs(db: Session) -> list[AssetTypeConfig]:
    return db.query(AssetTypeConfig).order_by(AssetTypeConfig.display_order.asc()).all()


def create_asset_type_config(db: Session, payload: AssetTypeConfigCreate) -> AssetTypeConfig:
    existing = db.query(AssetTypeConfig).filter(AssetTypeConfig.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset type '{payload.code}' already exists")
    cfg = AssetTypeConfig(**payload.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def update_asset_type_config(db: Session, cfg_id: int, payload: AssetTypeConfigUpdate) -> AssetTypeConfig:
    cfg = db.query(AssetTypeConfig).filter(AssetTypeConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Asset type not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


def delete_asset_type_config(db: Session, cfg_id: int) -> None:
    cfg = db.query(AssetTypeConfig).filter(AssetTypeConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Asset type not found")
    db.delete(cfg)
    db.commit()


# ── Role Configs ──────────────────────────────────────────────────────────────

_DEFAULT_ROLES = [
    {
        "name": "admin",
        "label": "管理員",
        "description": "完整系統存取權限，可管理所有後台功能。",
        "features": ["dashboard", "market_analysis", "portfolio", "stocks", "watchlist", "reports", "admin"],
    },
    {
        "name": "user",
        "label": "一般用戶",
        "description": "標準投資功能，可查看儀表板、自選股與投資組合。",
        "features": ["dashboard", "market_analysis", "portfolio", "stocks", "watchlist", "reports"],
    },
]


def seed_default_roles(db: Session) -> None:
    for item in _DEFAULT_ROLES:
        existing = db.query(RoleConfig).filter(RoleConfig.name == item["name"]).first()
        if not existing:
            db.add(RoleConfig(**item))
    db.commit()


def list_role_configs(db: Session) -> list[RoleConfig]:
    return db.query(RoleConfig).order_by(RoleConfig.name.asc()).all()


def create_role_config(db: Session, payload: RoleConfigCreate) -> RoleConfig:
    existing = db.query(RoleConfig).filter(RoleConfig.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{payload.name}' already exists")
    rc = RoleConfig(**payload.model_dump())
    db.add(rc)
    db.commit()
    db.refresh(rc)
    return rc


def update_role_config(db: Session, rc_id: int, payload: RoleConfigUpdate) -> RoleConfig:
    rc = db.query(RoleConfig).filter(RoleConfig.id == rc_id).first()
    if not rc:
        raise HTTPException(status_code=404, detail="Role not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(rc, k, v)
    db.commit()
    db.refresh(rc)
    return rc


def delete_role_config(db: Session, rc_id: int) -> None:
    rc = db.query(RoleConfig).filter(RoleConfig.id == rc_id).first()
    if not rc:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(rc)
    db.commit()


# ── Factor Correlation Reports ────────────────────────────────────────────────

def list_factor_corr_reports(
    db: Session,
    formula_type: str | None = None,
    report_month: str | None = None,
) -> list[FactorCorrReport]:
    q = db.query(FactorCorrReport)
    if formula_type:
        q = q.filter(FactorCorrReport.formula_type == formula_type)
    if report_month:
        q = q.filter(FactorCorrReport.report_month == report_month)
    return q.order_by(FactorCorrReport.report_month.desc()).all()


def create_factor_corr_report(db: Session, payload: FactorCorrReportCreate) -> FactorCorrReport:
    data = payload.model_dump()
    if data.get("factor_entries"):
        data["factor_entries"] = [
            e if isinstance(e, dict) else e.model_dump() for e in data["factor_entries"]
        ]
    report = FactorCorrReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def update_factor_corr_report(
    db: Session, report_id: int, payload: FactorCorrReportUpdate
) -> FactorCorrReport:
    report = db.query(FactorCorrReport).filter(FactorCorrReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    data = payload.model_dump(exclude_unset=True)
    if "factor_entries" in data and data["factor_entries"] is not None:
        data["factor_entries"] = [
            e if isinstance(e, dict) else e.model_dump() for e in data["factor_entries"]
        ]
    for k, v in data.items():
        setattr(report, k, v)
    db.commit()
    db.refresh(report)
    return report


def delete_factor_corr_report(db: Session, report_id: int) -> None:
    report = db.query(FactorCorrReport).filter(FactorCorrReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.query(StockCorrEntry).filter(StockCorrEntry.report_id == report_id).delete()
    db.delete(report)
    db.commit()


# ── Stock Correlation Entries ─────────────────────────────────────────────────

def list_stock_corr_entries(db: Session, report_id: int) -> list[StockCorrEntry]:
    return db.query(StockCorrEntry).filter(StockCorrEntry.report_id == report_id).all()


def upsert_stock_corr_entry(
    db: Session, report_id: int, payload: StockCorrEntryCreate
) -> StockCorrEntry:
    entry = (
        db.query(StockCorrEntry)
        .filter(StockCorrEntry.report_id == report_id, StockCorrEntry.symbol == payload.symbol)
        .first()
    )
    data = payload.model_dump()
    if data.get("indicator_weights"):
        data["indicator_weights"] = [
            e if isinstance(e, dict) else e.model_dump() for e in data["indicator_weights"]
        ]
    if entry:
        for k, v in data.items():
            setattr(entry, k, v)
    else:
        entry = StockCorrEntry(report_id=report_id, **data)
        db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_stock_corr_entry(
    db: Session, entry_id: int, payload: StockCorrEntryUpdate
) -> StockCorrEntry:
    entry = db.query(StockCorrEntry).filter(StockCorrEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    data = payload.model_dump(exclude_unset=True)
    if "indicator_weights" in data and data["indicator_weights"] is not None:
        data["indicator_weights"] = [
            e if isinstance(e, dict) else e.model_dump() for e in data["indicator_weights"]
        ]
    for k, v in data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


def delete_stock_corr_entry(db: Session, entry_id: int) -> None:
    entry = db.query(StockCorrEntry).filter(StockCorrEntry.id == entry_id).first()
    if entry:
        db.delete(entry)
        db.commit()


# ── Asset Roles ───────────────────────────────────────────────────────────────

def list_asset_roles(db: Session) -> list[AssetRole]:
    return db.query(AssetRole).order_by(AssetRole.display_order.asc(), AssetRole.name.asc()).all()


def create_asset_role(db: Session, payload: AssetRoleCreate) -> AssetRole:
    if db.query(AssetRole).filter(AssetRole.code == payload.code).first():
        raise HTTPException(status_code=409, detail=f"角色代碼 '{payload.code}' 已存在")
    role = AssetRole(**payload.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_asset_role(db: Session, role_id: int, payload: AssetRoleUpdate) -> AssetRole:
    role = db.query(AssetRole).filter(AssetRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(role, k, v)
    db.commit()
    db.refresh(role)
    return role


def delete_asset_role(db: Session, role_id: int) -> None:
    role = db.query(AssetRole).filter(AssetRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    db.query(AssetRoleLink).filter(AssetRoleLink.role_id == role_id).delete()
    db.delete(role)
    db.commit()


# ── Asset Role Links ──────────────────────────────────────────────────────────

def get_asset_roles(db: Session, asset_id: int) -> list[dict]:
    rows = (
        db.query(AssetRoleLink, AssetRole)
        .join(AssetRole, AssetRole.id == AssetRoleLink.role_id)
        .filter(AssetRoleLink.asset_id == asset_id)
        .all()
    )
    return [{"role_id": r.id, "role_name": r.name, "role_code": r.code, "color": r.color} for _, r in rows]


def set_asset_roles(db: Session, asset_id: int, role_ids: list[int]) -> list[dict]:
    db.query(AssetRoleLink).filter(AssetRoleLink.asset_id == asset_id).delete()
    for rid in set(role_ids):
        db.add(AssetRoleLink(asset_id=asset_id, role_id=rid))
    db.commit()
    return get_asset_roles(db, asset_id)


# ── Seed default asset roles ──────────────────────────────────────────────────

_DEFAULT_ASSET_ROLES = [
    # Stock roles
    {"name": "龍頭股", "code": "leader_stock", "applicable_types": ["stock"], "color": "#f59e0b", "display_order": 1},
    {"name": "指標股", "code": "indicator_stock", "applicable_types": ["stock"], "color": "#8b5cf6", "display_order": 2},
    {"name": "成長股", "code": "growth_stock", "applicable_types": ["stock"], "color": "#10b981", "display_order": 3},
    {"name": "價值股", "code": "value_stock", "applicable_types": ["stock"], "color": "#3b82f6", "display_order": 4},
    {"name": "高股息股", "code": "high_dividend_stock", "applicable_types": ["stock"], "color": "#ef4444", "display_order": 5},
    {"name": "週期股", "code": "cyclical_stock", "applicable_types": ["stock"], "color": "#f97316", "display_order": 6},
    {"name": "防禦股", "code": "defensive_stock", "applicable_types": ["stock"], "color": "#6366f1", "display_order": 7},
    {"name": "觀察股", "code": "watch_stock", "applicable_types": ["stock"], "color": "#94a3b8", "display_order": 8},
    # ETF roles
    {"name": "市場ETF", "code": "market_etf", "applicable_types": ["etf"], "color": "#0ea5e9", "display_order": 10},
    {"name": "產業ETF", "code": "sector_etf", "applicable_types": ["etf"], "color": "#14b8a6", "display_order": 11},
    {"name": "主題ETF", "code": "theme_etf", "applicable_types": ["etf"], "color": "#a855f7", "display_order": 12},
    {"name": "槓桿ETF", "code": "leveraged_etf", "applicable_types": ["etf"], "color": "#dc2626", "display_order": 13},
    {"name": "反向ETF", "code": "inverse_etf", "applicable_types": ["etf"], "color": "#b91c1c", "display_order": 14},
    {"name": "高股息ETF", "code": "high_dividend_etf", "applicable_types": ["etf"], "color": "#d97706", "display_order": 15},
    {"name": "債券ETF", "code": "bond_etf", "applicable_types": ["etf"], "color": "#64748b", "display_order": 16},
    {"name": "觀察ETF", "code": "watch_etf", "applicable_types": ["etf"], "color": "#94a3b8", "display_order": 17},
    # Fund roles
    {"name": "科技基金", "code": "tech_fund", "applicable_types": ["fund"], "color": "#7c3aed", "display_order": 20},
    {"name": "全球基金", "code": "global_fund", "applicable_types": ["fund"], "color": "#2563eb", "display_order": 21},
    {"name": "平衡基金", "code": "balanced_fund", "applicable_types": ["fund"], "color": "#059669", "display_order": 22},
    {"name": "債券基金", "code": "bond_fund", "applicable_types": ["fund"], "color": "#475569", "display_order": 23},
]


def seed_default_asset_roles(db: Session) -> None:
    for r in _DEFAULT_ASSET_ROLES:
        if not db.query(AssetRole).filter(AssetRole.code == r["code"]).first():
            db.add(AssetRole(**r, is_active=True))
    db.commit()
