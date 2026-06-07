from __future__ import annotations

import logging
import os

import pandas as pd
import requests
from dotenv import load_dotenv


logger = logging.getLogger(__name__)

FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data"
DEFAULT_TIMEOUT = 15


def _request_finmind(dataset: str, stock_id: str) -> pd.DataFrame:
    load_dotenv()
    token = os.getenv("FINMIND_API_TOKEN")
    params = {
        "dataset": dataset,
        "data_id": stock_id,
    }
    if token:
        params["token"] = token

    try:
        response = requests.get(FINMIND_API_URL, params=params, timeout=DEFAULT_TIMEOUT)
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or []
        if not data:
            logger.warning("FinMind returned no data for dataset=%s stock_id=%s", dataset, stock_id)
            return pd.DataFrame()
        return pd.DataFrame(data)
    except Exception as exc:
        logger.exception(
            "Failed to fetch FinMind dataset=%s stock_id=%s: %s",
            dataset,
            stock_id,
            exc,
        )
        return pd.DataFrame()


def fetch_financial_statement(stock_id: str) -> pd.DataFrame:
    """Fetch financial statements from FinMind."""
    return _request_finmind("TaiwanStockFinancialStatements", stock_id)


def fetch_monthly_revenue(stock_id: str) -> pd.DataFrame:
    """Fetch monthly revenue from FinMind."""
    return _request_finmind("TaiwanStockMonthRevenue", stock_id)
