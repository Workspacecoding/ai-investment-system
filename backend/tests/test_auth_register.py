import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402


client = TestClient(app)


def cleanup_user(email: str):
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == email).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_register_success_and_duplicate_email():
    email = f"test_user_{uuid4().hex}@example.com"
    payload = {
        "email": email,
        "password": "12345678",
        "name": "Test User",
    }
    cleanup_user(email)

    try:
        response = client.post("/register", json=payload)
        data = response.json()

        assert response.status_code in (200, 201)
        assert "id" in data
        assert data["email"] == payload["email"]
        assert data["name"] == payload["name"]
        assert "created_at" in data
        assert "password_hash" not in data

        duplicate_response = client.post("/register", json=payload)

        assert duplicate_response.status_code in (400, 409)
    finally:
        cleanup_user(email)
