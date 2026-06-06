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


def register_test_user(email: str, password: str = "12345678"):
    payload = {
        "email": email,
        "password": password,
        "name": "Test User",
    }
    return client.post("/register", json=payload)


def test_login_success_and_failures():
    email = f"test_user_{uuid4().hex}@example.com"
    password = "12345678"
    cleanup_user(email)

    try:
        register_response = register_test_user(email, password)
        assert register_response.status_code in (200, 201)

        response = client.post(
            "/login",
            json={
                "email": email,
                "password": password,
            },
        )
        data = response.json()

        assert response.status_code == 200
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

        wrong_password_response = client.post(
            "/login",
            json={
                "email": email,
                "password": "wrong-password",
            },
        )
        assert wrong_password_response.status_code in (400, 401)

        missing_email_response = client.post(
            "/login",
            json={
                "email": f"missing_{uuid4().hex}@example.com",
                "password": password,
            },
        )
        assert missing_email_response.status_code in (401, 404)
    finally:
        cleanup_user(email)
