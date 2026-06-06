import sys
from pathlib import Path

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_db_health():
    response = client.get("/db-health")
    data = response.json()

    assert response.status_code == 200
    assert data.get("status") == "ok" or data.get("database") == "connected"
